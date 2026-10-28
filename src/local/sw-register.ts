export interface RegisterDeps {
  nav: Pick<Navigator, "serviceWorker"> | undefined;
  buildId: string;
  isProd: boolean;
  location: Pick<Location, "protocol" | "hostname">;
}

export interface RegisterResult {
  registered: boolean;
  reason?: "unsupported" | "insecure" | "development";
}

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

/** Registers the offline worker for this build. Development gets none, and loses any left over from a production run. */
export async function registerServiceWorker(deps: RegisterDeps): Promise<RegisterResult> {
  const container = deps.nav?.serviceWorker;
  if (!container) return { registered: false, reason: "unsupported" };
  if (!deps.isProd) {
    const existing = await container.getRegistrations();
    await Promise.all(existing.map((registration) => registration.unregister()));
    return { registered: false, reason: "development" };
  }
  if (deps.location.protocol !== "https:" && !LOCAL_HOSTS.has(deps.location.hostname)) {
    return { registered: false, reason: "insecure" };
  }
  await container.register(`/sw.js?v=${encodeURIComponent(deps.buildId)}`, { scope: "/" });
  return { registered: true };
}
