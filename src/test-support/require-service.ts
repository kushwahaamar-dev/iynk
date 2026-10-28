/**
 * Decides whether a test that needs an outside service should skip. Under CI a
 * missing service is a failure, so a red gate can't turn green by skipping.
 */
export function serviceMissing(
  service: string,
  reason: string | null,
  env: Record<string, string | undefined> = process.env,
): boolean {
  if (reason === null) return false;
  if (env.CI && env.CI !== "0" && env.CI !== "false") {
    throw new Error(`required service "${service}" is missing: ${reason}`);
  }
  console.warn(`service "${service}" skipped: ${reason}`);
  return true;
}
