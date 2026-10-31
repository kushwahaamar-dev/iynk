export type PartsRoute = { kind: "parts-new" } | { kind: "parts-edit"; key: string };

export type StudioRoute =
  | { kind: "home" }
  | { kind: "project"; id: string; autorun: boolean }
  | { kind: "join"; room: string; token: string }
  | { kind: "shared" }
  | PartsRoute
  | { kind: "parts-info"; key: string };

const HOME: StudioRoute = { kind: "home" };
const PART_PAGE = /^#\/parts\/(edit|info)\/([a-z0-9][a-z0-9.-]{0,79}@[0-9]+\.[0-9]+\.[0-9]+)$/;
const PROJECT = /^#\/(prj_[a-z0-9][a-z0-9_-]{0,63})(?:\?(.*))?$/;
const SHARED = "#share-open";
const JOIN = /^#\/join\/(rm_[a-z2-7]{16})\.([A-Za-z0-9_-]{22})$/;

export function parseHash(hash: string): StudioRoute {
  if (hash === SHARED) return { kind: "shared" };
  const invite = JOIN.exec(hash);
  if (invite) return { kind: "join", room: invite[1], token: invite[2] };
  if (hash === "#/parts/new") return { kind: "parts-new" };
  const page = PART_PAGE.exec(hash);
  if (page) return { kind: page[1] === "edit" ? "parts-edit" : "parts-info", key: page[2] };
  const match = PROJECT.exec(hash);
  if (!match) return HOME;
  return { kind: "project", id: match[1], autorun: new URLSearchParams(match[2]).get("run") === "1" };
}

/** A join route prints as home: the invite token is read once from the address bar and never written back. A shared route prints as the marker that replaces the share fragment. */
export function routeHash(route: StudioRoute): string {
  if (route.kind === "shared") return SHARED;
  if (route.kind === "parts-new") return "#/parts/new";
  if (route.kind === "parts-edit") return `#/parts/edit/${route.key}`;
  if (route.kind === "parts-info") return `#/parts/info/${route.key}`;
  if (route.kind !== "project") return "#/";
  return `#/${route.id}${route.autorun ? "?run=1" : ""}`;
}

let cached: { hash: string; route: StudioRoute } = { hash: "", route: HOME };

/** Stable between calls while the hash is unchanged, as useSyncExternalStore needs. */
export function readRoute(): StudioRoute {
  const hash = window.location.hash;
  if (hash !== cached.hash) cached = { hash, route: parseHash(hash) };
  return cached.route;
}

export function subscribeRoute(fn: () => void): () => void {
  window.addEventListener("hashchange", fn);
  return () => window.removeEventListener("hashchange", fn);
}

export function navigate(route: StudioRoute, mode: "push" | "replace" = "push"): void {
  const hash = routeHash(route);
  if (mode === "replace") {
    window.history.replaceState(null, "", hash);
    window.dispatchEvent(new HashChangeEvent("hashchange"));
  } else {
    window.location.hash = hash;
  }
}
