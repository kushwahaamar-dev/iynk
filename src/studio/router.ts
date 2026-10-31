export type PartsRoute = { kind: "parts-new" } | { kind: "parts-edit"; key: string };

export type StudioRoute = { kind: "home" } | { kind: "project"; id: string; autorun: boolean } | PartsRoute;

const HOME: StudioRoute = { kind: "home" };
const PART_EDIT = /^#\/parts\/edit\/([a-z0-9][a-z0-9.-]{0,79}@[0-9]+\.[0-9]+\.[0-9]+)$/;
const PROJECT = /^#\/(prj_[a-z0-9][a-z0-9_-]{0,63})(?:\?(.*))?$/;

export function parseHash(hash: string): StudioRoute {
  if (hash === "#/parts/new") return { kind: "parts-new" };
  const edit = PART_EDIT.exec(hash);
  if (edit) return { kind: "parts-edit", key: edit[1] };
  const match = PROJECT.exec(hash);
  if (!match) return HOME;
  return { kind: "project", id: match[1], autorun: new URLSearchParams(match[2]).get("run") === "1" };
}

export function routeHash(route: StudioRoute): string {
  if (route.kind === "home") return "#/";
  if (route.kind === "parts-new") return "#/parts/new";
  if (route.kind === "parts-edit") return `#/parts/edit/${route.key}`;
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
