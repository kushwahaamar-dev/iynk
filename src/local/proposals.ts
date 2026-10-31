import { validateProposal } from "@/project/generated/validate.mjs";
import type { Repository } from "./repository";

export type ProposalRetention = "session" | "project" | "forever";

export interface RetainLimits {
  perProject: number;
  acceptedDays: number;
  otherDays: number;
}

export interface ProposalRow {
  id: string;
  projectId: string;
  state: string;
  createdAt: number;
  decidedAt?: number;
  /** The `ProposalRecord` of the AI layer, kept as opaque data. */
  body: unknown;
}

type Aged = Pick<ProposalRow, "id" | "state" | "createdAt" | "decidedAt">;

const DAY_MS = 24 * 60 * 60 * 1000;

function isRow(value: unknown): value is ProposalRow {
  if (typeof value !== "object" || value === null) return false;
  const r = value as Partial<ProposalRow>;
  return (
    typeof r.id === "string" &&
    typeof r.projectId === "string" &&
    typeof r.state === "string" &&
    typeof r.createdAt === "number" &&
    typeof r.body === "object" &&
    r.body !== null &&
    validateProposal((r.body as { proposal?: unknown }).proposal)
  );
}

const settledAt = (r: Aged) => r.decidedAt ?? r.createdAt;

/**
 * What a sweep does to one project's rows. Open rows are left over from an earlier session, so they expire
 * rather than being removed, unless they are old enough to go.
 */
export function sweepPlan(
  rows: readonly Aged[],
  now: number,
  retention: ProposalRetention,
  limits: RetainLimits,
): { remove: string[]; expire: string[] } {
  if (retention === "session") {
    return { remove: rows.map((r) => r.id), expire: rows.filter((r) => r.state === "open").map((r) => r.id) };
  }

  const remove = new Set<string>();
  const expire = new Set<string>();
  if (retention === "project") {
    for (const r of rows) {
      const days = r.state === "accepted" ? limits.acceptedDays : limits.otherDays;
      if (now - settledAt(r) > days * DAY_MS) remove.add(r.id);
      else if (r.state === "open") expire.add(r.id);
    }
  }

  const kept = rows.filter((r) => !remove.has(r.id));
  const excess = kept.length - limits.perProject;
  if (excess > 0) {
    const rank = (r: Aged) => (r.state === "accepted" ? 1 : 0);
    const droppable = kept
      .filter((r) => r.state !== "open" || expire.has(r.id))
      .sort((a, b) => rank(a) - rank(b) || settledAt(a) - settledAt(b));
    for (const r of droppable.slice(0, excess)) {
      remove.add(r.id);
      expire.delete(r.id);
    }
  }
  return { remove: [...remove], expire: [...expire] };
}

function expiredBody(body: unknown): unknown {
  const record = body as { state?: string; proposal?: { status?: string } };
  return { ...record, state: "expired", proposal: { ...record.proposal, status: "expired" } };
}

export function createProposalRows(repo: Pick<Repository, "getStore">) {
  const store = repo.getStore("proposals");

  async function list(projectId: string): Promise<ProposalRow[]> {
    const entries = await store.entries();
    return entries.map(([, value]) => value).filter((v): v is ProposalRow => isRow(v) && v.projectId === projectId);
  }

  return {
    put: (r: ProposalRow) => store.put(r.id, r),

    async get(projectId: string, id: string): Promise<ProposalRow | undefined> {
      const value = await store.get(id);
      return isRow(value) && value.projectId === projectId ? value : undefined;
    },

    list,

    async remove(projectId: string, id: string): Promise<void> {
      const value = await store.get(id);
      if (isRow(value) && value.projectId === projectId) await store.delete(id);
    },

    /** Returns how many rows were removed. */
    async sweep(projectId: string, now: number, retention: ProposalRetention, limits: RetainLimits): Promise<number> {
      const rows = await list(projectId);
      const plan = sweepPlan(rows, now, retention, limits);
      for (const id of plan.remove) await store.delete(id);
      for (const row of rows.filter((r) => plan.expire.includes(r.id))) {
        await store.put(row.id, { ...row, state: "expired", body: expiredBody(row.body) });
      }
      return plan.remove.length;
    },
  };
}

/** Returns how many rows were removed. Rows are matched by `projectId` alone, so corrupt ones go too. */
export async function deleteProposals(
  repo: Pick<Repository, "getStore" | "clearStores">,
  scope: { projectId: string } | "all",
): Promise<number> {
  const store = repo.getStore("proposals");
  const entries = await store.entries();
  if (scope === "all") {
    await repo.clearStores(["proposals"]);
    return entries.length;
  }
  const doomed = entries.filter(([, value]) => (value as Partial<ProposalRow> | null)?.projectId === scope.projectId);
  for (const [key] of doomed) await store.delete(key);
  return doomed.length;
}
