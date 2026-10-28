/** A same-origin room link as a path the router can push. */
export function roomPath(link: string): string {
  const url = new URL(link);
  return `${url.pathname}${url.search}`;
}
