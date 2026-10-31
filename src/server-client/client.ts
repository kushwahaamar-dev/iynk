import { deriveIdentityId } from "../protocol/identity.ts";
import { enrol, probeServer, request, signIn } from "./auth.ts";
import type { Session as AuthSession } from "./auth.ts";
import type { DeviceKeyStore } from "./keys.ts";
import { ClientError, NeedsEnrolment, ServerUnreachable, SigningInputMismatch } from "./types.ts";
import type {
  Api,
  Buddy,
  DeletionStatus,
  Identity,
  IdentityPatch,
  Page,
  Pairing,
  PairingCreate,
  PairingCreated,
  PairingPeek,
  PairingRef,
  ServerInfo,
  Session,
} from "./types.ts";

export type { Api } from "./types.ts";

export type PageOptions = { limit?: number; cursor?: string };

export type ServerClient = {
  probe(): Promise<ServerInfo>;
  enrol(a: { code: string; displayName: string; locale: string }): Promise<Identity>;
  signIn(): Promise<AuthSession>;
  signOut(): Promise<void>;
  me(): Promise<Identity>;
  updateMe(patch: IdentityPatch): Promise<Identity>;
  listSessions(page?: PageOptions): Promise<Page<Session>>;
  revokeSession(id: string): Promise<void>;
  createPairing(opts?: PairingCreate): Promise<PairingCreated>;
  listPairings(page?: PageOptions): Promise<Page<Pairing>>;
  revokePairing(id: string): Promise<void>;
  peekPairing(ref: PairingRef): Promise<PairingPeek>;
  redeemPairing(ref: PairingRef): Promise<Buddy>;
  listBuddies(page?: PageOptions): Promise<Page<Buddy>>;
  getBuddy(id: string): Promise<Buddy>;
  renameBuddy(id: string, alias: string): Promise<Buddy>;
  removeBuddy(id: string): Promise<void>;
  requestDeletion(confirm: string): Promise<DeletionStatus>;
  cancelDeletion(): Promise<void>;
  fetchAuthed(path: string, init?: RequestInit): Promise<Response>;
  fetchAnon(path: string, init?: RequestInit): Promise<Response>;
};

function query(page: PageOptions | undefined): string {
  const params = new URLSearchParams();
  if (page?.limit) params.set("limit", String(page.limit));
  if (page?.cursor) params.set("cursor", page.cursor);
  const text = params.toString();
  return text ? `?${text}` : "";
}

const enc = encodeURIComponent;

export function createClient(o: {
  base: string;
  keys: DeviceKeyStore;
  fetch?: typeof fetch;
  onSession?: (s: AuthSession | null) => void;
}): ServerClient {
  const api: Api = { base: o.base, fetch: o.fetch ?? ((input, init) => fetch(input, init)) };
  let session: AuthSession | null = null;
  let renewing: Promise<AuthSession> | null = null;

  const setSession = (s: AuthSession | null) => {
    session = s;
    o.onSession?.(s);
  };

  const signInStored = async () => {
    const key = await o.keys.get(api.base);
    if (!key) throw new NeedsEnrolment();
    const next = await signIn(api, o.keys, deriveIdentityId(key.publicSpki));
    setSession(next);
    return next;
  };

  const renew = () => {
    renewing ??= signInStored().finally(() => {
      renewing = null;
    });
    return renewing;
  };

  const send = <T>(method: string, path: string, body?: unknown) =>
    request<T>(api, method, path, { body, token: session?.token });

  // An unknown identity gets a challenge with a dummy thumbprint, so it shows up here as a mismatch.
  const lapse = (e: unknown): never => {
    const refused = e instanceof NeedsEnrolment || e instanceof SigningInputMismatch;
    if (refused || (e instanceof ClientError && e.status === 401)) {
      setSession(null);
      throw new NeedsEnrolment();
    }
    throw e;
  };

  const withRenewal = async <T>(attempt: () => Promise<T>, unauthorised: (r: T) => boolean): Promise<T> => {
    try {
      const first = await attempt();
      if (!unauthorised(first)) return first;
    } catch (e) {
      if (!(e instanceof ClientError) || e.status !== 401) throw e;
    }
    try {
      await renew();
      const second = await attempt();
      if (unauthorised(second)) throw new NeedsEnrolment();
      return second;
    } catch (e) {
      return lapse(e);
    }
  };

  const call = <T>(method: string, path: string, body?: unknown): Promise<T> =>
    withRenewal(() => send<T>(method, path, body), () => false);

  const rawFetch = async (path: string, init: RequestInit, token: string | null): Promise<Response> => {
    const headers = new Headers(init.headers);
    headers.delete("authorization");
    if (token) headers.set("authorization", `Bearer ${token}`);
    try {
      return await api.fetch(`${api.base}/v1${path}`, { ...init, headers });
    } catch (e) {
      if ((e as { name?: string } | null)?.name === "AbortError") throw e;
      throw new ServerUnreachable();
    }
  };

  return {
    probe: () => probeServer(api),
    async enrol(a) {
      const result = await enrol(api, o.keys, a);
      setSession(result.session);
      return result.identity;
    },
    signIn: renew,
    async signOut() {
      try {
        if (session) await send<void>("DELETE", "/auth/tokens/current");
      } finally {
        setSession(null);
      }
    },
    me: () => call("GET", "/identities/me"),
    updateMe: (patch) => call("PATCH", "/identities/me", patch),
    listSessions: (page) => call("GET", `/auth/sessions${query(page)}`),
    revokeSession: (id) => call("DELETE", `/auth/sessions/${enc(id)}`),
    createPairing: (opts) => call("POST", "/pairings", opts),
    listPairings: (page) => call("GET", `/pairings${query(page)}`),
    revokePairing: (id) => call("DELETE", `/pairings/${enc(id)}`),
    peekPairing: (ref) => request<PairingPeek>(api, "POST", "/pairings/peek", { body: ref }),
    async redeemPairing(ref) {
      const redeemed = await call<{ buddy: Buddy }>("POST", "/pairings/redeem", { pairing: ref });
      return redeemed.buddy;
    },
    listBuddies: (page) => call("GET", `/buddies${query(page)}`),
    getBuddy: (id) => call("GET", `/buddies/${enc(id)}`),
    renameBuddy: (id, alias) => call("PATCH", `/buddies/${enc(id)}`, { alias }),
    removeBuddy: (id) => call("DELETE", `/buddies/${enc(id)}`),
    requestDeletion: (confirm) => call("POST", "/identities/me/deletion", { confirm }),
    cancelDeletion: () => call("DELETE", "/identities/me/deletion"),
    fetchAuthed: (path, init = {}) =>
      withRenewal(() => rawFetch(path, init, session?.token ?? null), (r) => r.status === 401),
    fetchAnon: (path, init = {}) => rawFetch(path, init, null),
  };
}
