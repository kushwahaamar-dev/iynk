# ADR-0401: Studio is a static client page; the project is chosen by the URL fragment

Status: proposed, 2026-10-27, revised after review the same day. Author: frontend and backend architecture seat.
Upstream: D-015, A11, F-008, Next docs `static-exports.md`, `lazy-loading.md`. Downstream: F-079, F-092, F-174, F-175, F-200. Spec: FRONTEND_ARCHITECTURE sections 5.1 and 5.2.

## Problem

Projects live in the browser (D-015). Their ids exist only there. A Next dynamic route would need ids at build time or a request-time render that sends the id to a server.

## Constraints

1. No server may see a project id or content in the default setup.
2. `cacheComponents` and the static `[lang]` shell stay (`layout.tsx:24`).
3. The app may later be hosted as plain static files; do not block that.
4. Language switching must keep the open project.

## Considered options

| Option | Summary | Verdict |
|---|---|---|
| A. `/studio/[projectId]` | Dynamic segment | Rejected: no real params at build; id goes to the server on a request-time render |
| B. `/studio?p=prj_x` | Query string | Rejected: ids reach proxy logs and `Referer` |
| C. `/studio#/prj_x` | Fragment | **Chosen** |
| D. `output: 'export'` | Whole app static | Rejected for now: redirects, headers and proxy are unsupported in a static export; the app uses `redirects()` |

## Decision

1. One prerendered page per language at `/[lang]/studio`.
2. A client wrapper loads `StudioEntry` with `next/dynamic` and `ssr: false` (not allowed directly in a Server Component).
3. The open project is `#/<prj_id>`; a room invite is `#room=<token>`; a share is `#share=<id>`. Studio has its own tiny router for these.
4. The server page passes the `studio` strings as props and renders a sized loading frame.

## Technical justification

A URL fragment is not sent in an HTTP request and is not part of `Referer` (EXTERNAL: URL and HTTP specifications), so the id cannot reach a proxy log by construction. One prerendered page per language keeps the static shell that D-011 needs and works from a plain static host. The Next docs state `ssr: false` is not allowed directly in a Server Component (`lazy-loading.md:94`, VERIFIED), hence the client wrapper.

## Performance data

No measurement of Studio exists yet. The shell budget is 450 KB gzip first load (ESTIMATED from parts, FRONTEND section 11.2) against a measured 701 KB gzip for a lesson page today (PERFORMANCE_BASELINE section 1). Room for the editor chunk to load after first paint is the reason for `ssr: false`. FE-3 records the real Studio shell size.

## Cost implications

No dependency. The fragment router is small custom code in `studio`. The cost is that Studio owns back and forward state (`hashchange`).

## Licensing

Next.js 16.4.3 is MIT (VERIFIED in `node_modules`). Nothing new is added.

## Security implications

A project id never reaches a server in the default setup (F-008). Room invites and share ids sit in the fragment and so stay out of server logs, but they are visible to scripts on the page and are stored in browser history and in any browser history sync (EXTERNAL, browser behaviour). An invite should therefore be single use or expire (REALTIME_ARCHITECTURE owns that). The page has no per-request data, which is also what lets the CSP be static (ADR-0405).

## Reversibility

Medium to high. Nothing in `studio` needs a Node request, so choice D (static export) stays open. Switching to a path segment later would change only the router module and the saved links.

## Migration plan

No v1 data. The legacy lab routes (`/boards`, `/robotics`, `/drones`) stay static until the labs are moved in (FE-5), then redirect to templates. The language switch loads another static page; the open project survives in IndexedDB.

## Known limitations

- No server-rendered view of a project, so no link previews. If wanted, add a separate public share page; do not move the editor.
- Back and forward depend on a hand-written hash router.
- Invites in history sync, as above.
- Two tabs on one project are possible; the save-time revision check handles it (R-035).
