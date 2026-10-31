import { utf8Length } from "../../core/canonical.ts";
import { buildPartIndex, searchParts } from "../../parts/search.ts";
import type { Descriptor } from "../../parts/descriptor.ts";
import type { Component as ProjectComponent, Net } from "../../project/generated/types.ts";
import { fence } from "../context/fences.ts";
import type { TrustClass } from "../context/fences.ts";
import { redactSecrets } from "../context/redact.ts";
import { cleanField, quoteField } from "../context/sanitize.ts";
import type { PartnerSources } from "../sources.ts";
import { TOOL_DOCS } from "./help.ts";
import { parseRef, resolveRef, suggestIds } from "./refs.ts";
import type { RefKind } from "./refs.ts";
import type { ToolResult } from "./registry.ts";
import { toolSchemas } from "./schemas.ts";
import type { ToolArgs, ToolName } from "./schemas.ts";

export type ReadToolName = Exclude<ToolName, "highlight" | "open_panel">;

/** Who wrote the text each tool returns. The first class labels the fence. */
export const READ_TAINT: Record<ReadToolName, TrustClass[]> = {
  get_project_summary: ["P"],
  get_component: ["P", "R"],
  get_netlist: ["P"],
  get_source: ["P"],
  get_sim_state: ["S", "P"],
  get_trace: ["S"],
  get_diagnostics: ["S", "P"],
  get_objectives: ["P"],
  get_part_facts: ["R"],
  search_library: ["R"],
  read_tool_doc: ["R"],
  check_rules: ["S"],
};

export const RESULT_BUDGET_BYTES = 6_000;
const MEMBERS_PER_NET = 60;
const SOURCE_LINES = 400;
const SOURCE_LINE_CAP = 240;
const DIAGNOSTIC_ENTRIES = 20;
const RULE_FINDINGS = 30;
const SERIAL_TAIL = 10;
const TRUNCATION_HINT = "(cut here; narrow the request to see the rest)";

type Failure = Extract<ToolResult, { ok: false }>;
type Out = { lines: string[]; truncated?: boolean } | Failure;

const fail = (code: Failure["code"], message: string): Failure => ({ ok: false, code, message });

/** A project text field as the model sees it: secrets removed, invisible characters shown, capped. */
const field = (raw: string, cap?: number): string => cleanField(redactSecrets(raw).text, cap).text;
const quoted = (raw: string, cap?: number): string => quoteField(redactSecrets(raw).text, cap);

function plain(text: unknown, locale: string): string {
  if (typeof text === "string") return text;
  if (typeof text !== "object" || text === null) return "";
  const byLang = text as Record<string, unknown>;
  const pick = byLang[locale] ?? byLang.en ?? Object.values(byLang).find((v) => typeof v === "string");
  return typeof pick === "string" ? pick : "";
}

function need(token: string, kinds: readonly RefKind[], s: PartnerSources): { id: string } | Failure {
  const ref = parseRef(token);
  const resolved = ref && kinds.includes(ref.kind) ? resolveRef(ref, s) : null;
  if (resolved?.ok) return { id: ref!.id };
  const nearest = resolved ? resolved.nearest : suggestIds(token, kinds, s);
  const near = nearest.length > 0 ? ` Nearest: ${nearest.join(", ")}.` : "";
  return fail("unknown_ref", `No ${kinds.join(" or ")} ${quoted(token, 60)} in this project.${near}`);
}

const isFailure = (x: object): x is Failure => "ok" in x;

function quantity(x: unknown): string {
  if (typeof x !== "object" || x === null) return "unknown";
  const q = x as Record<string, unknown>;
  const parts = (["min", "typ", "value", "max"] as const).flatMap((k) => (typeof q[k] === "number" ? [`${k}=${q[k]}`] : []));
  const unit = typeof q.unit === "string" ? ` ${q.unit}` : "";
  return parts.length > 0 ? parts.join(" ") + unit : "unknown";
}

function ratingLines(d: Descriptor): string[] {
  return Object.entries(d.ratings).flatMap(([key, rating]) => {
    if (!rating) return [];
    const r = rating as Record<string, unknown>;
    const source = (["manufacturer", "measured", "simulation"] as const).find((k) => r[k] !== undefined);
    const value = source ? quantity(r[source]) : "unknown";
    return [`rating ${field(key, 60)} ${String(r.measure)} ${String(r.role)} ${value} source=${source ?? "none"}`];
  });
}

function partLines(d: Descriptor, locale: string, fields: ReadonlySet<string>): string[] {
  const lines: string[] = [];
  if (fields.has("identity")) {
    const i = d.identity;
    lines.push(`part ${d.id}@${d.version} ${quoted(`${i.manufacturer} ${i.model}`, 80)} kind=${i.kind} category=${i.category}`);
  }
  if (fields.has("simulation")) {
    lines.push(`simulation tier=${d.simulation.tier} status=${d.simulation.status}`);
    for (const t of d.simulation.what_it_models) lines.push(`models ${quoted(plain(t, locale), 160)}`);
    for (const t of d.simulation.not_modelled) lines.push(`not modelled ${quoted(plain(t, locale), 160)}`);
  }
  if (fields.has("pins")) for (const p of d.pins) lines.push(`pin ${field(p.id, 48)} type=${p.type}`);
  if (fields.has("ratings")) lines.push(...ratingLines(d));
  if (fields.has("sources")) {
    for (const src of d.sources) lines.push(`source ${field(src.id, 48)} ${src.kind} reliability=${src.reliability} ${quoted(src.title, 100)}`);
  }
  return lines;
}

const ALL_PART_FIELDS: ReadonlySet<string> = new Set(["identity", "pins", "ratings", "sources", "simulation"]);

function netLine(n: Net): { line: string; cut: boolean } {
  const shown = n.connections.slice(0, MEMBERS_PER_NET).map((c) => `${c.c}.${c.p}`);
  const more = n.connections.length - shown.length;
  const name = n.name === undefined ? "" : ` ${quoted(n.name, 60)}`;
  const line = `net ${n.id}${name} class=${n.class ?? "signal"} pins=${n.connections.length}: ${shown.join(" ")}${more > 0 ? ` +${more} more` : ""}`;
  return { line, cut: more > 0 };
}

function netsAround(start: string, depth: number, nets: readonly Net[]): Net[] {
  const byComponent = new Map<string, Net[]>();
  for (const n of nets) for (const c of n.connections) byComponent.set(c.c, [...(byComponent.get(c.c) ?? []), n]);
  const seenComponents = new Set([start]);
  const picked = new Map<string, Net>();
  let frontier = [start];
  for (let d = 0; d < depth; d++) {
    const next: string[] = [];
    for (const component of frontier) {
      for (const n of byComponent.get(component) ?? []) {
        if (picked.has(n.id)) continue;
        picked.set(n.id, n);
        for (const c of n.connections) {
          if (!seenComponents.has(c.c)) {
            seenComponents.add(c.c);
            next.push(c.c);
          }
        }
      }
    }
    frontier = next;
  }
  return [...picked.values()];
}

const sealedAndHidden = (s: PartnerSources): boolean => {
  const item = s.itemState();
  return item !== null && item.phase !== "revealed";
};

const ms = (tNs: number): number => Math.round(tNs / 1000) / 1000;

type Handlers = { [N in ReadToolName]: (a: ToolArgs<N>, s: PartnerSources) => Out };

const handlers: Handlers = {
  get_project_summary(a, s) {
    const { revision, stateHash, doc } = s.project();
    const lines = [
      `project ${quoted(doc.meta.title, 120)} kind=${doc.meta.kind} rev=${revision} hash=${stateHash.slice(0, 8)}`,
      `boards=${doc.boards.length} components=${doc.components.length} nets=${doc.nets.length} sources=${doc.sources.length} tests=${doc.tests.length} faults=${doc.simulation.faults.length}`,
    ];
    if (a.level === "D0") return { lines };
    for (const c of [...doc.boards, ...doc.components]) {
      lines.push(`${c.id.startsWith("brd_") ? "board" : "component"} ${c.id} refdes=${field(c.refdes, 16)} part=${c.definition.ref}@${c.definition.version}${c.label ? ` label=${quoted(c.label, 60)}` : ""}`);
    }
    if (a.level === "D1") return { lines };
    for (const n of doc.nets) lines.push(netLine(n).line);
    for (const f of doc.sources) lines.push(`source ${f.id} path=${quoted(f.path, 80)} language=${f.language} role=${f.role} bytes=${utf8Length(f.content)}`);
    for (const t of doc.tests) {
      const hidden = t.checks.filter((c) => c.visibility === "hidden").length;
      lines.push(`test ${field(t.id, 48)} ${quoted(plain(t.name, s.locale()), 80)} checks=${t.checks.length - hidden} hidden=${hidden}`);
    }
    return { lines };
  },

  get_component(a, s) {
    const found = need(a.id, ["component"], s);
    if (isFailure(found)) return found;
    const { doc } = s.project();
    const c: ProjectComponent = [...doc.boards, ...doc.components].find((x) => x.id === found.id)!;
    const { ref, version } = c.definition;
    const lines = [`${c.id.startsWith("brd_") ? "board" : "component"} ${c.id} refdes=${field(c.refdes, 16)}${c.label ? ` label=${quoted(c.label, 60)}` : ""} part=${ref}@${version}`];
    const params = Object.entries(c.params ?? {}).slice(0, 20);
    if (params.length > 0) lines.push(`params ${params.map(([k, v]) => `${field(k, 32)}=${field(JSON.stringify(v), 60)}`).join(" ")}`);

    const netOf = new Map<string, Net>();
    for (const n of doc.nets) for (const p of n.connections) netOf.set(`${p.c}/${p.p}`, n);
    const snapshot = doc.dependencies.components.find((d) => d.ref === ref && d.version === version);
    const descriptor = s.registry().get(ref, version);
    const pins = snapshot ? snapshot.interface.pins.map((p) => p.id) : descriptor ? descriptor.pins.map((p) => p.id) : [];
    for (const pin of pins) {
      const net = netOf.get(`${c.id}/${pin}`);
      if (!net) {
        lines.push(`pin ${c.id}.${pin} net=- (not connected)`);
        continue;
      }
      const others = net.connections.filter((p) => !(p.c === c.id && p.p === pin));
      const shown = others.slice(0, 8).map((p) => `${p.c}.${p.p}`);
      lines.push(`pin ${c.id}.${pin} net=${net.id} with ${shown.join(" ") || "-"}${others.length > 8 ? ` +${others.length - 8} more` : ""}`);
    }
    if (!descriptor) {
      lines.push("part facts: unknown (the part definition is not loaded)");
      return { lines };
    }
    lines.push(...partLines(descriptor, s.locale(), new Set(["simulation", "ratings"])));
    return { lines };
  },

  get_netlist(a, s) {
    const { doc } = s.project();
    const wanted = new Map<string, Net>();
    for (const token of a.nets ?? []) {
      const found = need(token, ["net"], s);
      if (isFailure(found)) return found;
      wanted.set(found.id, doc.nets.find((n) => n.id === found.id)!);
    }
    if (a.around !== undefined) {
      const found = need(a.around, ["component"], s);
      if (isFailure(found)) return found;
      for (const n of netsAround(found.id, a.depth ?? 1, doc.nets)) wanted.set(n.id, n);
    }
    const pool = a.nets === undefined && a.around === undefined ? doc.nets : [...wanted.values()];
    const limit = a.max ?? 200;
    let truncated = pool.length > limit;
    const lines: string[] = [];
    for (const n of pool.slice(0, limit)) {
      const row = netLine(n);
      truncated ||= row.cut;
      lines.push(row.line);
    }
    return { lines: lines.length > 0 ? lines : ["no nets"], truncated };
  },

  get_source(a, s) {
    const { revision, doc } = s.project();
    const found = need(a.id, ["source"], s);
    if (isFailure(found)) return found;
    const file = doc.sources.find((f) => f.id === found.id)!;
    const all = redactSecrets(file.content).text.split("\n");
    const from = a.from ?? 1;
    const requested = a.to ?? from + SOURCE_LINES - 1;
    if (requested < from) return fail("bad_args", "to must not be smaller than from");
    const to = Math.min(requested, from + SOURCE_LINES - 1, all.length);
    const lines = [`source ${file.id} path=${quoted(file.path, 80)} language=${file.language} role=${file.role} lines=${all.length} rev=${revision}`];
    if (from > all.length) return fail("bad_args", `${file.id} has ${all.length} lines`);
    for (let n = from; n <= to; n++) {
      const text = all[n - 1];
      lines.push(`${n}|${text === "" ? "" : cleanField(text, SOURCE_LINE_CAP).text}`);
    }
    return { lines, truncated: to < Math.min(requested, all.length) };
  },

  get_sim_state(_a, s) {
    const run = s.run();
    if (!run) return { lines: ["no run yet; the simulation has not started"] };
    const lines = [`run phase=${run.phase} stale=${run.stale} t=${ms(run.tNs)}ms`];
    lines.push(run.solver ? `solver converged=${run.solver.converged}${run.solver.note ? ` note=${quoted(run.solver.note, 120)}` : ""}` : "solver none");
    for (const p of run.pins) lines.push(`pin ${field(p.target, 80)} ${p.level}`);
    for (const r of run.readings) {
      const value = r.tier === "not-modelled" ? "not modelled yet" : `${field(String(r.value), 40)} ${field(r.unit, 16)}`;
      lines.push(`reading ${field(r.target, 80)} = ${value} tier=${r.tier} provenance=${field(r.provenance, 60)}`);
    }
    const first = Math.max(0, run.serial.length - SERIAL_TAIL);
    run.serial.slice(first).forEach((e, i) => lines.push(`serial ev:serial/${first + i} t=${ms(e.tNs)}ms ${e.kind} ${quoted(e.text, 120)}`));
    return { lines };
  },

  get_trace(a, s) {
    if (a.to_ms < a.from_ms) return fail("bad_args", "to_ms must not be smaller than from_ms");
    const trace = s.trace(a.target, a.from_ms, a.to_ms, a.maxPoints);
    if (!trace.ok) {
      if (trace.code === "no_run") return { lines: ["no run yet; the simulation has not started"] };
      if (trace.code === "not_modelled") return fail("not_modelled", `${quoted(a.target, 60)} is not modelled yet`);
      const near = suggestIds(a.target, ["sim", "net", "component"], s);
      return fail("unknown_ref", `No trace target ${quoted(a.target, 60)}.${near.length > 0 ? ` Nearest: ${near.join(", ")}.` : ""}`);
    }
    if (trace.tier === "not-modelled") return fail("not_modelled", `${quoted(a.target, 60)} is not modelled yet`);
    const lines = [`trace ${field(a.target, 80)} unit=${field(trace.unit, 16)} tier=${trace.tier} provenance=${field(trace.provenance, 60)}`];
    for (const b of trace.buckets.slice(0, a.maxPoints)) lines.push(`t=${b.tMs}ms min=${b.min} max=${b.max}`);
    return { lines, truncated: trace.buckets.length > a.maxPoints };
  },

  get_diagnostics(a, s) {
    const lines: string[] = [];
    let truncated = false;
    const add = (rows: string[]) => {
      truncated ||= rows.length > DIAGNOSTIC_ENTRIES;
      lines.push(...rows.slice(0, DIAGNOSTIC_ENTRIES));
    };
    const wants = (kind: NonNullable<typeof a.kind>) => a.kind === undefined || a.kind === kind;
    const run = s.run();

    if (wants("compile") || wants("runtime")) {
      add(
        (run?.diagnostics ?? []).map((d) => {
          const where = d.file ? ` at ${field(d.file, 80)}${d.line === undefined ? "" : `:${d.line}`}` : "";
          return `diagnostic${d.code ? ` ${field(d.code, 40)}` : ""}${where} ${quoted(d.message, 160)}`;
        }),
      );
    }
    if (wants("solver") && run?.solver) {
      lines.push(`solver converged=${run.solver.converged}${run.solver.note ? ` note=${quoted(run.solver.note, 120)}` : ""}`);
    }
    if (wants("faults")) {
      const hiddenItem = sealedAndHidden(s);
      add(
        s.diagnoses().flatMap((d) => {
          const causeShown = !hiddenItem && d.hint_level >= 3;
          const row = [`symptom ${field(d.symptom_id, 48)} hint_level=${d.hint_level}${causeShown ? ` cause=${field(d.cause_id, 48)}` : ""}`];
          if (causeShown || d.hint_level >= 2) {
            for (const e of d.evidence) row.push(`evidence ${e.kind} ${field(e.ref, 80)} = ${field(String(e.value), 40)}${e.unit ? ` ${field(e.unit, 16)}` : ""} tier=${e.tier} provenance=${e.provenance}`);
          }
          return row;
        }),
      );
    }
    if (wants("rules")) {
      if (sealedAndHidden(s)) lines.push("rules withheld while this item is sealed");
      else add(s.rules().map((f) => `rule ${field(f.ruleId, 60)} targets=${f.targets.map((t) => field(t, 80)).join(",") || "-"}`));
    }
    return { lines: lines.length > 0 ? lines : ["nothing to report"], truncated };
  },

  get_objectives(_a, s) {
    const { doc } = s.project();
    const locale = s.locale();
    const lines: string[] = [];
    const guide = doc.guide;
    if (guide) {
      lines.push(`guide ${quoted(plain(guide.title, locale), 120)} kind=${guide.kind}`);
      (guide.steps ?? []).forEach((step, i) => lines.push(`step ${i + 1} ${quoted(plain(step, locale), 160)}`));
    }
    let hidden = 0;
    for (const t of doc.tests) {
      lines.push(`test ${field(t.id, 48)} ${quoted(plain(t.name, locale), 80)}`);
      for (const c of t.checks) {
        if (c.visibility === "hidden") hidden++;
        else lines.push(`check ${field(c.id, 48)} ${c.kind} ${quoted(plain(c.label, locale), 120)} last=unknown`);
      }
    }
    lines.push(`hidden checks: ${hidden}`);
    return { lines };
  },

  get_part_facts(a, s) {
    const locale = s.locale();
    const fields = a.fields === undefined ? ALL_PART_FIELDS : new Set<string>(a.fields);
    let descriptor: Descriptor | undefined;
    let unknown = "";
    if (a.component !== undefined) {
      const found = need(a.component, ["component"], s);
      if (isFailure(found)) return found;
      const { doc } = s.project();
      const { ref, version } = [...doc.boards, ...doc.components].find((x) => x.id === found.id)!.definition;
      descriptor = s.registry().get(ref, version) ?? s.registry().latest(ref);
      unknown = ref;
    } else {
      const wanted = a.ref!;
      descriptor = s.registry().latest(wanted);
      unknown = wanted;
      if (!descriptor) {
        const near = suggestIds(wanted, ["part"], s);
        return fail("unknown_ref", `No part ${quoted(wanted, 60)} in the library.${near.length > 0 ? ` Nearest: ${near.join(", ")}.` : ""}`);
      }
    }
    if (!descriptor) return { lines: [`part ${field(unknown, 80)}: unknown (the registry has no facts for it)`] };
    return { lines: partLines(descriptor, locale, fields) };
  },

  search_library(a, s) {
    const registry = s.registry();
    const limit = a.limit ?? 10;
    const hits = searchParts(buildPartIndex(registry), a.query, s.locale()).filter((entry) => {
      const d = registry.latest(entry.ref);
      if (!d) return false;
      return (
        (a.filters?.kind === undefined || d.identity.kind === a.filters.kind) &&
        (a.filters?.domain === undefined || d.identity.category === a.filters.domain) &&
        (a.filters?.pins === undefined || d.pins.length === a.filters.pins)
      );
    });
    const lines = hits.slice(0, limit).map((e) => `part ${e.ref} ${quoted(e.name, 80)} category=${e.category} model=${e.model}`);
    return { lines: lines.length > 0 ? lines : ["no matching parts"], truncated: hits.length > limit };
  },

  read_tool_doc(a) {
    return { lines: TOOL_DOCS[a.topic].split("\n") };
  },

  check_rules(a, s) {
    for (const token of a.scope ?? []) {
      const found = need(token, ["component", "net"], s);
      if (isFailure(found)) return found;
    }
    if (sealedAndHidden(s)) return { lines: ["rule findings are withheld while this item is sealed"] };
    const findings = s.rules(a.scope);
    const lines = findings.slice(0, RULE_FINDINGS).map((f) => `rule ${field(f.ruleId, 60)} targets=${f.targets.map((t) => field(t, 80)).join(",") || "-"}`);
    return { lines: lines.length > 0 ? lines : ["no findings"], truncated: findings.length > RULE_FINDINGS };
  },
};

function render(name: ReadToolName, lines: readonly string[], cut: boolean, nonce: string): string {
  const body = cut ? [...lines, TRUNCATION_HINT] : lines;
  return fence(`tool:${name}`, READ_TAINT[name][0] as Exclude<TrustClass, "A">, body.join("\n"), nonce);
}

/**
 * Runs one read tool: validates the arguments, checks every id against the live document, and returns the answer as
 * a fenced text of at most `budgetBytes`. A failure is data, never a throw.
 */
export function runRead(name: ReadToolName, args: unknown, s: PartnerSources, o: { nonce: string; budgetBytes?: number }): ToolResult {
  const parsed = toolSchemas[name].safeParse(args);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return fail("bad_args", `${issue.path.join(".") || "arguments"}: ${cleanField(issue.message, 120).text}`);
  }
  const handler = handlers[name] as (a: unknown, s: PartnerSources) => Out;
  const out = handler(parsed.data, s);
  if (isFailure(out)) return out;

  const budget = o.budgetBytes ?? RESULT_BUDGET_BYTES;
  try {
    const whole = render(name, out.lines, out.truncated === true, o.nonce);
    if (utf8Length(whole) <= budget) {
      return { ok: true, text: whole, bytes: utf8Length(whole), taint: READ_TAINT[name], truncated: out.truncated === true };
    }
    let low = 0;
    let high = out.lines.length;
    while (low < high) {
      const mid = Math.ceil((low + high) / 2);
      if (utf8Length(render(name, out.lines.slice(0, mid), true, o.nonce)) <= budget) low = mid;
      else high = mid - 1;
    }
    const text = render(name, out.lines.slice(0, low), true, o.nonce);
    if (utf8Length(text) > budget) return fail("too_large", "the result does not fit the byte budget even when cut to nothing");
    return { ok: true, text, bytes: utf8Length(text), taint: READ_TAINT[name], truncated: true };
  } catch {
    return fail("internal", "the fence nonce appeared in the data; run the call again with a new nonce");
  }
}
