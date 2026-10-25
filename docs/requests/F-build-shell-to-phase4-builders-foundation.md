# F-build-shell to F-build-boards, -robotics, -drones, -panels: the foundation is in (2026-10-25 03:30 CDT)

Everything in POLISH-SPEC §1 is on `origin/main` (commits "Final pass S1" to "S8 and S9"). What differs from the spec
or is easy to trip on:

1. **Import the frame from `@/components/shell/workspace` in a client file.** `@/components/shell` also exports the
   header, footer and `UntranslatedNotice`, which import `server-only`; a `"use client"` workspace that imports the
   barrel breaks the build. Server page files can keep using the barrel (`UntranslatedNotice variant="chip"`).
2. `WorkspaceFrame` passes `data-*` and other div props to its root (`data-testid`, `data-lesson`, `data-bench-page`).
   Phone stage height: put `[--stage-h:56svh]` in its `className` (drones workshop).
3. **Toolbar rows** (`flex-nowrap overflow-x-auto`): give `Button`s there `shrink-0 whitespace-nowrap`, or they shrink
   and wrap their label. `SegmentedControl` (not `stretch`) is `shrink-0` already.
4. `Panel` without `title` is just the box: its body is `flex min-h-0 flex-1 flex-col`, so `<Panel><Tabs fill …/></Panel>`
   fills the rail. It clips with `overflow: clip`, so `listClassName="ws-sticky-tabs"` sticks under the figure on a
   phone. With a `title`, the body pads and scrolls.
5. `IconButton` is a client component now and draws its own tooltip (from `label`, or `title` if you pass one) under
   the button; pass `tooltipSide="top"` near the bottom of the screen. `size="sm"` is 36 px, 44 px on touch.
6. `SoundToggle compact` keeps `data-testid="sound-toggle"` and the name "Sound". `UsageToggle` is a `Toggle`
   (role `switch`) and lives in the header's Settings; delete your `<UsageToggle />` lines (two copies on a page are
   harmless meanwhile).
7. `FigureFrame fill` works in a flex column (the `.ws-stage`): the plate takes what the toolbar and drawer leave.
   The driver's engine now has a `chrome {hide: [ids]}` message for the figure's own buttons (docs/FIGURES.md);
   sending it needs a `protocol.ts` type, which is F-build-panels' file in phase 4.
8. Measured on a test page with the frame (not committed): plate 960 × 648 at 1440 × 900 (48 %, top 186 px),
   1296 × 828 at 1920 × 1080 (52 %). A taller bar or a second toolbar row pushes the top past 200 px.
9. `Callout variant="quiet"`, `StatStrip`, `Select`/`TextInput` (`@/components/ui`), `Popover`, `Tabs` `badge`,
   `phoneGrid`, `fill`, `ProgressBadge size="xs"`, `.ink-label`, `--console-*` (also as `bg-console`,
   `text-console-accent`, `text-console-warn`, `text-console-err`, `text-console-ink`, `text-console-muted`,
   `bg-console-well`) are all there as the spec names them.
