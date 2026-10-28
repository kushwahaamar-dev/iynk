const ORIGIN = /^(https?|wss?):\/\/[^/?#\s]+$/;

/** Keeps the bare http, https, ws and wss origins of a comma separated list; anything else is dropped. */
export function parseOrigins(raw: string): string[] {
  return raw
    .split(",")
    .map((origin) => origin.trim())
    .filter((origin) => ORIGIN.test(origin));
}

/**
 * The policy for every page and API route (D-022). Scripts and styles keep 'unsafe-inline' because Next
 * writes its flight data into inline scripts; everything else stays closed, and connect-src is what stops a
 * page from sending a stored key to another origin.
 */
export function buildCsp({ dev, connectOrigins }: { dev: boolean; connectOrigins: readonly string[] }): string {
  return [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'${dev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "worker-src 'self' blob:",
    ["connect-src 'self'", ...connectOrigins].join(" "),
    "img-src 'self' data: blob:",
    "font-src 'self'",
    "frame-src 'self'",
    "frame-ancestors 'self'",
    "object-src 'none'",
    "base-uri 'none'",
    "form-action 'self'",
  ].join("; ");
}

/** The policy for /figures/*: self-contained generated files with inline scripts and styles, and no network (D-B1-3). */
export function buildFigureCsp(): string {
  return [
    "default-src 'none'",
    "script-src 'unsafe-inline'",
    "style-src 'unsafe-inline'",
    "img-src data: blob:",
    "font-src data:",
    "connect-src 'none'",
    "form-action 'none'",
    "frame-src 'none'",
    "object-src 'none'",
    "frame-ancestors 'self'",
  ].join("; ");
}
