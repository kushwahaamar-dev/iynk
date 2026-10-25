# POLISH-SPEC: the final pass, decided (F-direction, 2026-10-25 03:00 CDT)

Built from the seven phase-1 reports: `docs/design/research.md`, `docs/verify/fresh-eyes.md` and
`docs/verify/ui-audit-{shell,boards,robotics,drones,panels}.md`. Read with `docs/SPEC.md` and the shared rules in
`scripts/workflows/final.md`. Task ids in brackets point back to the finding they fix: **FE** = fresh-eyes, **SH** /
**BO** / **RO** / **DR** / **PA** = the five audits, **R** = a research principle.

The whole design in one sentence: **lab pages become full-viewport workspaces (a slim title bar, the figure as the
largest cell, one tabbed rail beside it, nothing important below the fold), reading pages share one frame and one
measure, and the chrome gets calmer: sans for UI text, mono only for code and numbers, one box per pane, one primary
per area.** The look stays SimLab's: paper, grain, ink lines, the five palettes, hand-cut corners, Newsreader titles.

How to use this file:

- Each builder does its list in order. **P0** is the job; **P1** is expected; **P2** only when P0 and P1 are verified
  and committed. What you don't reach goes in your report's `notDone`.
- Class names, props and tokens below are the contract between F-build-shell and the four surface builders. If you
  need something that isn't here, build it inside your own files and say so in your report; don't wait.
- Keep every route, every `data-testid`, every keyboard shortcut and the reduced-motion path. Where a task moves a
  panel into a tab, the e2e change it allows is **clicking the tab before the assertion**, never a weaker assertion.
- Sizes to hit (F-review measures them): on a lab page at 1440 × 900 the figure plate takes **≥ 45 %** of the
  viewport (today 22–32 %) and its top edge is **≤ 200 px** (today 375–620); at 1920 × 1080 **≥ 50 %** (today
  14–20 %); the page does not scroll inside the workspace at ≥ 1024 px wide (the panels do); at 390 × 844 the figure
  is on the first screen, no control under 44 px, no sideways scroll.

---

## 1. Shared decisions (F-build-shell implements them)

### 1.1 Tokens (in `globals.css`, on `:root`)

| Token | Value | Use |
|---|---|---|
| `--header-h` | `58px` (header `h-14` = 56 px + its 2 px rule) | every `calc()` that subtracts the header; the sticky offsets |
| `--frame-max` | `80rem`; `none` when the page has a workspace (`:root:has([data-frame="workspace"])`) | the header, footer and reading frame width |
| `--rail-w` | `clamp(22rem, 30vw, 36rem)` | the workspace rail (352 px at 1024, 432 at 1440, 576 at 1920) |
| `--stage-h` | `46svh` below `md`, `52svh` from `md` to `lg` | the sticky figure height under `lg` |
| `--card-line` | light `var(--line)`; dark `var(--rule)` | card and callout borders (SH U11) |
| `--card-shadow` | light `3px 3px 0 var(--shadow-c)`; dark `none` | card and callout offset shadow (SH U11) |
| `--plate-frame` | light `#231e16`; dark `#cfc6b4` | the figure plate's 2 px border, so the plate keeps a frame in dark (FE U14) |
| `--console-bg`, `--console-ink`, `--console-accent`, `--console-warn` | light and dark values from the hexes now hard-coded in `DroneWorkspace` / `CliConsole` (`#1d2a26`, `#8af0ae`, `#f2c230`) | the Betaflight log and CLI (DR N9) |

`--plate-frame` and `--console-*` are declared on `:root` only, not in the `:root, .ink-plate` light block, so they
inherit into plates the way `--plate-bg` does. `.ink-card` uses `border-color: var(--card-line); box-shadow:
var(--card-shadow)`. `.ink-plate` uses `border-color: var(--plate-frame)`. Controls (buttons, fields, toggles) keep
`--line` in both themes: the strong line is for things you press and for plates.

Breakpoints are Tailwind's: `sm` 640, `md` 768, **`lg` 1024 is where the workspace grid turns on**, `xl` 1280,
`2xl` 1536. The dock's phone query (`max-width: 767px`) stays as it is.

### 1.2 Frames

**Reading frame** (landing, about, together, passport, verify, 404, the three catalogues): class `.frame` =
`mx-auto w-full max-w-(--frame-max) px-4 sm:px-6`. One width for all of them (today 1280 / 1024 / 896 / 672: SH U3,
FE U17). Text inside keeps a measure: paragraphs and `.ink-prose` at `max-w-[68ch]`, left-aligned to the frame's edge.
Side material (a figure, cards, the originals) uses the rest of the row. Sections `space-y-16` at `lg`, `space-y-10`
below. The header's and footer's inner containers use the same `.frame` class, so the logo lines up with the content
on reading pages and with the workspace gutter on lab pages.

**Workspace frame**: a new `src/components/shell/WorkspaceFrame.tsx`, exported from `@/components/shell`.

```tsx
type WorkspaceFrameProps = {
  bar: ReactNode;          // a <WorkspaceBar>
  stage: ReactNode;        // the figure column: a toolbar row, <FigureFrame fill>, overlays, a <StageDrawer>
  rail: ReactNode;         // one <Panel>, usually holding <Tabs fill>
  below?: ReactNode;       // reading material after the workspace; normal page scroll
  phoneStage?: "sticky" | "full"; // under lg: "sticky" (default) pins the stage at --stage-h; "full" = the fly range
  className?: string;      // e.g. "[--rail-w:clamp(24rem,34vw,38rem)]" for the lesson's wider code rail
} & Omit<ComponentProps<"div">, "className" | "children">; // data-* (data-testid, data-lesson…) pass to the root
```

It renders `<div data-frame="workspace">` holding the grid `<div className="ws">` (children `.ws-bar`, `.ws-stage`,
`.ws-rail`) and, after the grid, `<div className="ws-below">` when `below` is given. The classes live in
`globals.css` (`@layer components`) so nobody copies the `calc()`:

- `.ws`: grid, one column, `gap-3 px-4 pt-2 pb-4`. At `lg`: `height: calc(100dvh - var(--header-h))`,
  `grid-template-columns: minmax(0,1fr) var(--rail-w)`, `grid-template-rows: auto minmax(0,1fr)`, `gap: 1rem`.
- `.ws-bar`: spans both columns.
- `.ws-stage`: `relative flex min-h-0 min-w-0 flex-col gap-2`. Under `lg` with `phoneStage="sticky"`: `position:
  sticky; top: var(--header-h); z-index: 10; height: var(--stage-h); background: var(--paper)` (the paper must be
  opaque: rail content scrolls under it). With `"full"`: not sticky, `height: calc(100svh - var(--header-h) - 3.5rem)`.
- `.ws-rail`: `min-h-0 min-w-0`; at `lg` its child fills it (`h-full`) and scrolls inside itself.
- `.ws-below`: `px-4 pb-12 pt-8`; content inside keeps its own measure (`.ink-prose`, or grids).
- `.ws-sticky-tabs`: for a rail's tablist under `lg`: `position: sticky; top: calc(var(--header-h) + var(--stage-h));
  z-index: 9; background: var(--surface)`. No effect at `lg`.

Result at 1440 × 900: bar 56 px, a stage cell about 960 × 745; after a 40 px toolbar row the plate is about 960 × 650
(48 %). At 1920 × 1080 the plate is about 1290 × 860 (54 %). Keep the rows around the plate to one toolbar above and
at most one 32 px readout row below. On a phone: header 58, bar about 56, figure 388 px, then the rail; the figure
never leaves the screen while the rail scrolls (fixes "acting off screen" on every phone page: BO B1, RO 1 and 4,
DR B1).

The footer stays in the layout: on a workspace page it sits below `.ws-below`, out of the way.

**WorkspaceBar**: `src/components/shell/WorkspaceBar.tsx`.

```tsx
type WorkspaceBarProps = {
  back: { href: string; label: string }; // "‹ Arduino Uno R3": text link from md, chevron-only IconLink below
  kicker?: ReactNode;                    // "Lesson 2 of 16", "Fig. 01 · Freestyle · Betaflight 2026.6.2"
  title: ReactNode;                      // rendered as the page's h1
  tone?: "cobalt" | "mint" | "tomato";   // a 10 px ink-bordered swatch before the kicker: the lab's one colour touch
  status?: ReactNode;                    // Done pill, compact progress, the untranslated chip
  actions?: ReactNode;                   // right end, in this order: page primary, Sound, ?, Lab tools
};
```

One row, `min-h-14 flex flex-wrap items-center gap-x-4 gap-y-1`. Left: back, then a block with the kicker (`.ink-kicker`)
over the h1 (`font-head text-xl lg:text-2xl leading-tight`, wraps at most to two lines, never truncates). Then
`status`. Then `actions` at `ms-auto flex items-center gap-1.5`. Below `sm` the actions may wrap to a second line;
nothing else in the bar may. Lab tones: boards cobalt, robotics mint, drones tomato (`dashboard/labs.ts`).

**StageDrawer**: `src/components/shell/StageDrawer.tsx`, the IDE-terminal pattern under the figure (R 3).

```tsx
type StageDrawerProps = {
  title: string;              // "Serial monitor", "Betaflight log"
  summary?: ReactNode;        // the last line, shown in the closed bar (truncated)
  open: boolean;
  onOpenChange: (open: boolean) => void;
  height?: number;            // open body height in px, default 200
  children: ReactNode;        // stays mounted when closed (refs and data-* survive), hidden with `hidden`
};
```

Closed: a 40 px bar (kicker title, summary in mono 12 px, a chevron IconButton with `aria-expanded`). Open: the body
below the bar, fixed height, `overflow-y-auto`. It takes its height from the figure, never from the page.

**Panel**: `src/components/ui/Panel.tsx`, the one box of a pane.

```tsx
type PanelProps = { title?: ReactNode; titleId?: string; actions?: ReactNode; className?: string; children: ReactNode };
```

`ink-card flex min-h-0 flex-col overflow-hidden`; with a title, a header row `min-h-11 flex items-center gap-2
border-b-[1.5px] border-rule px-4` holding an h2 (`font-head text-lg`); body `min-h-0 flex-1 overflow-y-auto p-4`.
Inside a Panel there are **no more cards**: rows are `divide-y divide-rule` with `py-3`, groups are separated by a
kicker and space. The rail of every workspace is one Panel whose first child is a `Tabs fill` (the tablist is the
header).

### 1.3 Type

One scale, Tailwind's own steps, **floor 12 px** (SH U4, BO U19, PA U8, DR measurements):

| Step | px | Use |
|---|---|---|
| `text-xs` | 12 | kicker, meta lines, chips, tooltips, tab badges |
| `text-sm` | 14 | UI: buttons, tabs, nav, labels, dense panel prose, the code editor |
| `text-base` | 16 | body, prose, quiz answers |
| `text-lg` | 18 | lede, card titles (h3), panel h2, stat values in strips |
| `text-xl` | 20 | workspace title on phones |
| `text-2xl` | 24 | workspace title at `lg`, stat values in tiles |
| `text-3xl` | 30 | section h2 on reading pages |
| h1 clamp | 32 → 52 | reading-page h1 only (the existing `clamp(2rem, 1.4rem + 2.6vw, 3.25rem)`) |

Base CSS: `h2 { font-size: clamp(1.5rem, 1.2rem + 1vw, 1.875rem) }`, `h3 { font-size: 1.125rem }`. In files you
touch, replace every arbitrary size (`text-[0.65rem]`, `text-[0.7rem]`, `text-[10px]`, `text-[11px]`,
`text-[0.62rem]`, `text-[0.95rem]` …) with the nearest step; nothing under 12 px.

Families, by job:

- **Newsreader** (`font-head`): h1–h3, the wordmark, panel titles.
- **Source Sans 3** (`font-body`): body **and all UI text**: buttons, tabs, nav, segmented options, labels, callout
  titles, quiz answers, toggles. Weight 600 for controls, 400 for prose.
- **IBM Plex Mono** (`font-ui`): code, numbers and readouts (`tabular`), pin names, part designators, CLI, chips that
  hold a pin or protocol, and the one kicker style.

Classes:

- `.ink-kicker` stays as it is (mono 12 px 700, 0.12em, uppercase, muted): the only small-caps style. Never put a unit,
  a part number or a value with a unit in it (that is how "500 mA" became "500 MA": RO 2).
- `.ink-label` (new): `font-body text-xs font-semibold text-muted`, no uppercase, no tracking. Field labels, meter
  labels, anything that may hold a unit.
- `.font-ui` text that isn't code (chip, readout) gets `tracking-normal` (drop `tracking-wide` / `tracking-wider` in
  ui components).
- Hindi and Chinese (SH U5, PA U9, DR N7): under `html:lang(hi)` and `html:lang(zh-Hans)`, `.ink-kicker`,
  `.ink-label` and `.font-ui:not(code, pre, kbd, .tabular)` take `font-family: var(--font-body)`, `letter-spacing: 0`,
  `text-transform: none`. Hindi stops overriding `--font-display`; instead `:is(h1,h2,h3,h4,.font-head):lang(hi) {
  font-family: var(--font-devanagari), var(--font-display), serif }` (zh keeps its own rule), and the wordmark span
  gets `lang="en"` (it is a name), so it keeps Newsreader in every language.

### 1.4 Spacing

4/8 grid. Workspace: `gap-3`/`gap-4` between cells, `p-4` inside a panel, rows `py-3`, controls in a row `gap-1.5`
(icon buttons) or `gap-2`. Reading pages: `space-y-16` between sections at `lg`, card grids `gap-4 lg:gap-6`. One
border per panel (R 8). Don't add a border to separate things a space or a rule can separate.

### 1.5 Colour roles

Unchanged palette and tokens. Roles: `paper` page, `surface` panels and cards, `sunken` wells, tracks and the closed
drawer bar, `plate` figures, `ink` text and control lines, `muted` secondary text, `rule` dividers (and card borders
in dark). **Mustard `primary`: one per area** (the bar, the rail, a dialog). Tomato only for danger and the active
fault; mint for done and passing; cobalt for info. A lab's colour appears once per page (the bar swatch) and on its
catalogue cards. Pastel fills keep `.on-fill`. The figure plate stays light paper in dark mode (SPEC, colorfigures
guide); in dark it now has a light ink frame (`--plate-frame`).

Global base rule: `input[type=checkbox], input[type=radio], input[type=range] { accent-color: var(--ink) }`, so no
browser blue is left anywhere (FE U17, BO U17, DR U13).

### 1.6 Components (one style per job)

All changes are backward compatible: same exports, same props, same variant names. New props are optional.

| Job | Component | Decision |
|---|---|---|
| The one next action in an area | `Button variant="primary"` | mustard, raised (offset shadow), `font-body font-semibold` |
| Other actions | `Button variant="secondary"` | surface fill, 2 px ink line, **flat** (no offset shadow), hover `bg-sunken`; `aria-pressed` = ink fill |
| Toolbar text actions, clear, cancel | `Button variant="ghost"` | transparent, hover `bg-sunken`, no border on hover |
| Destructive or the active fault | `Button variant="danger"` | tomato, raised; use it for at most one thing on screen |
| Icon-only action | `IconButton` | 44 px; new `size="sm"` = 36 px on fine pointers (44 on coarse); it renders `Tooltip` with the label (new optional `shortcut` prop shows a `Kbd`), and drops the native `title` |
| On/off | `Toggle` | as is; the only switch style (no native checkboxes for settings) |
| One of a few | `SegmentedControl` | never wraps: `flex-nowrap overflow-x-auto` (scrollbar hidden); new `stretch` prop = equal-width segments over the full width; sans 14 px |
| Siblings in one pane | `Tabs` | restyled, see below |
| A field | `Select`, `TextInput` (new, `src/components/ui/Field.tsx`) | `ComponentProps<"select"/"input"> & { label: ReactNode; hideLabel?: boolean }`: an `.ink-label` over an `.ink-field` (the 44 px pill; textareas keep `rounded-ink-sm`); one shape everywhere (SH U9, DR U13) |
| A box | `Card` | as is, plus `tone="flat"` (no border, no shadow, transparent); dark mode softens through `--card-line` |
| The one box of a pane | `Panel` (new) | §1.2 |
| An aside | `Callout` | calmer: 1.5 px `--card-line` border, a 4 px start bar in the tone colour instead of the 44 px icon band, the icon inline before the title, title in `font-body text-sm font-semibold` **sentence case**, body `text-sm`, `--card-shadow`; new `variant="quiet"` = one line, no border, muted, icon + text, for "not set up" notes. Keep `role` behaviour |
| A tag | `Chip` | mono 12 px 600, `tracking-normal` |
| A number | `Stat` | sizes: `sm` value `text-lg`, `md` `text-2xl`, `lg` `text-4xl` (reading pages only); value `font-bold`, `whitespace-nowrap` |
| A row of numbers | `StatStrip` (new, in `Stat.tsx`) | `div` (not `dl`) `flex flex-wrap gap-x-6 gap-y-2`, each `Stat size="sm"` `shrink-0`; for telemetry, live status, design tiles (DR U5 axe `definition-list`) |
| A gauge | `Meter` | label `.ink-label` (fixes "MA"), bar `h-2.5`, 1.5 px border |
| Progress | `ProgressBadge` | root `flex flex-wrap items-center gap-x-3 gap-y-1`; label `min-w-0` (no `shrink-0`), bar `min-w-16 flex-1`, count `shrink-0`: when the row is too narrow the bar and count drop under the label (SH B2). New `size="xs"`: label `sr-only`, a 4 px borderless bar `w-24`, count `text-xs`, for the workspace bar |
| A drawer on a phone | `Sheet` | new `height?: "auto" \| "full"` (`full` = `h-[85dvh]`, so tabs switch in place: PA U6); a 36 × 4 grabber line at the top (decorative); title sentence case sans |
| A menu or small form over the page | `Popover` (new, `src/components/ui/Popover.tsx`) | `{ label: string; trigger: ReactElement; align?: "start" \| "end"; children; className? }`: clones the trigger with `aria-expanded`, `aria-controls`, `aria-haspopup="dialog"`; the panel is `role="dialog"` with `aria-label`, the native `popover="auto"` attribute (top layer, light dismiss, Escape), placed under the trigger from its rect and kept inside the viewport, `ink-card p-3 w-[min(20rem,calc(100vw-2rem))]`; focus goes to the first control on open and back to the trigger on close |
| A modal | `Dialog` | as is; close button uses the global focus ring (RO 12) |
| A hint | `Tooltip` | new optional `shortcut` |
| Small caps | `.ink-kicker` | the only one |

**Tabs** (`Tabs.tsx`), new optional props, old ones unchanged:

- `fill?: boolean`: root `flex h-full min-h-0 flex-col`, each tabpanel `min-h-0 flex-1 overflow-y-auto p-4` (instead of
  `pt-4`). For rails.
- `listClassName?: string`: e.g. `ws-sticky-tabs`.
- `phoneGrid?: boolean`: below `sm` the tablist is a `grid grid-cols-3` of equal cells whose labels may wrap to two
  lines (six tabs make two rows), instead of a strip that cuts the last tabs (DR U16, BO U18, PA U6, FE U10).
- `TabItem` gets `badge?: ReactNode`, drawn after the label as `ms-1.5 rounded-full bg-sunken px-1.5 font-ui text-xs
  tabular` ("Checks 2/3", "Steps 3/25").
- Look: no folder tabs. Tablist `flex gap-1 overflow-x-auto px-2 pt-1 border-b-[1.5px] border-rule`; a tab is
  `min-h-11 px-3 font-body text-sm font-semibold text-muted hover:text-ink`, the selected one `text-ink` with a
  2.5 px ink underline (`box-shadow: inset 0 -2.5px 0 var(--ink)`). Sentence case, no uppercase. The padding keeps the
  focus ring unclipped (PA N1). On select, the tab scrolls itself into view (`scrollIntoView({ block: "nearest",
  inline: "nearest" })`); when the list overflows, a `data-overflow` attribute adds an edge fade (`mask-image`).

**Icons** (`icons.tsx`), add: `chevron-left`, `keyboard`, `settings` (gear), `tools` (wrench), `sound-on`,
`sound-off`, `rotate-left`, `rotate-right`, `target` (into the figure), `reset` (recentre), `expand`, `lock`, `undo`,
`panel-right`. Same 24 grid and round ink strokes.

**Button details**: sizes `sm` `min-h-9 px-3 text-sm` (44 on coarse, as now), `md` `min-h-11 px-4 text-sm`, `lg`
`min-h-13 px-6 text-base`. Disabled, any variant: `bg-sunken text-muted border-rule shadow-none`, no opacity, no
translate (DR N3: a disabled primary must stop looking like the call to action).

### 1.7 Header, settings, footer

**Header** (`SiteHeader`, `NavLinks`, `MobileNav`, `ThemeControl`, `LanguagePicker`): one row in every language at
every width from 1024 (SH B1, FE U2, BO U9).

- `h-14`, inner container `.frame`. Logo 34 px + the wordmark, **no tagline** (SH U15, FE nit 9).
- Nav from `lg` (was `md`): links `whitespace-nowrap font-body text-sm font-semibold`, active = ink pill as now.
- Right end: one **Settings** `IconButton` (`settings` icon, label `shell.settings.label` "Settings") opening a
  `Popover` with, in order: Theme (`SegmentedControl stretch` with the three options and icons), Language (`Select`,
  same behaviour as `LanguagePicker`: keeps path, query and hash, sets the cookie), Sound (`Toggle`), Reduce motion
  (`Toggle`, writes `settings.reduceMotion`, the `data-reduce-motion` switch already reads it), Anonymous usage counts
  (the existing `UsageToggle` with its `data-testid="usage-toggle"`). The Sound toggle here has **no**
  `data-testid` (the workspace's `SoundToggle` keeps `sound-toggle`; `e2e/sound.spec.ts` looks inside `main`).
- Below `lg`: the menu sheet holds the nav, then the same settings block (theme as `SegmentedControl stretch`, fixing
  "Dark" on its own row: SH U6).
- Measure each language at 1024 and 1280. If one still wraps, shorten that language's `shell.json` nav labels (es
  "Placas · Robótica · Drones" style) and list old → new in your report (PITCH and VIDEO name no header label).
- `e2e/shell.spec.ts` lines 80–112 open the Settings popover before using the theme radios and the language combobox.
- New strings (all six languages): `shell.settings.label`, `common.client.motion.label` ("Reduce motion"). Nothing
  else.

**Footer** (`SiteFooter`, `FooterNav`): one row on desktop, about 72 px (SH U13): left the wordmark and the privacy
line; right About, Together (Passport and Verify when on) and the Colorfigures credit, `.frame` container, `mt-0` with
a 2 px top rule. Phone: two short stacks, about 160 px. One name for the About page (use the header's). Links
`min-w-11` (SH N3). No tagline.

**Sound and usage**: `SoundToggle` gets `compact?: boolean` → an `IconButton` (`sound-on`/`sound-off`, label
"Sound", `aria-pressed`, `data-testid="sound-toggle"` kept). Workspaces use `<SoundToggle compact />` in the bar.
`UsageToggle` lives only in the Settings popover; surface builders delete their `<UsageToggle />` lines (SH U12).

### 1.8 Focus and motion

Keep the global `:focus-visible` ring (2.5 px `--focus` + halo) everywhere; fix the theme segment whose ring computes
to paper (SH N2) and the dialog close button (RO 12). Motion: under 220 ms, ease-out, `transform`/`opacity` only;
the dock drawer slides with `animate-ink-from-end`, popovers fade with `animate-ink-fade`; `ink-pop` only on a passed
check, a finished step or a finished lesson. Nothing animates on a key press. Both reduced-motion paths stay.

### 1.9 F-build-shell's task list

Order matters: S1–S4 are what the surface builders start from. Commit after each.

1. **P0 S1 Tokens and base CSS** (§1.1, §1.3, §1.5): tokens, `.frame`, `.ws*`, `.ink-label`, h2/h3 sizes, dark card
   tokens, plate frame, hi/zh rules, `accent-color`, console tokens. [SH U3 U4 U5 U11, FE U14 U17, PA U9, DR N7 N9]
2. **P0 S2 Components** (§1.6): Button, IconButton (+`size`, tooltip, `shortcut`), Card `flat`, Callout (+`quiet`),
   Chip, Stat + StatStrip, Meter, ProgressBadge (+`xs`, wrap), Tabs (`fill`, `listClassName`, `phoneGrid`, `badge`,
   look), SegmentedControl (`stretch`, no wrap), Sheet `height`, Tooltip `shortcut`, new Panel, Field (`Select`,
   `TextInput`), Popover, icons. Update `ui/index.ts`. Run `npx vitest run src/components` (Tabs and SegmentedControl
   tests must still pass). [SH B2 U9, BO U6 U10 U11 U12 U18, RO 2 5, DR U5 U13 U16 N3, PA N1 U6 U8]
3. **P0 S3 Frames**: `WorkspaceFrame`, `WorkspaceBar`, `StageDrawer` (§1.2), exported from `@/components/shell`. Add
   `fill?: boolean` to `FigureFrame` (`src/components/figure/FigureFrame.tsx`): root `h-full min-h-0`, the plate
   wrapper `relative min-h-0 flex-1`, the iframe `h-full w-full` with no aspect ratio and no `max-h`; with `fill`, the
   "Figure controls (n)" `<details>` is `sr-only` until focus is inside it (`focus-within:not-sr-only`), then shows as
   an overlay at the plate's bottom (`absolute inset-x-3 bottom-3 max-h-[50%] overflow-auto`): it stays the keyboard
   and screen-reader path, and stops being a third copy on screen (R 5, R 14, DR U8). This one file is
   F-build-panels' in phase 4; it is free in phase 3 (see §5). [FE U1, BO U1, RO 3, DR U1 U2]
4. **P0 S4 Header and settings** (§1.7), `e2e/shell.spec.ts`, `SoundToggle compact`, UsageToggle in Settings,
   Reduce motion toggle. [SH B1 U6 U12 U15 N2, FE U2]
5. **P1 S5 Footer** (§1.7). [SH U13 N3]
6. **P1 S6 Landing** (`[lang]/page.tsx`, `dashboard/*`) [SH U1 U2 U7 U8 B2, FE U15]:
   - `title: { absolute: "SimLab · <tagline>" }` from the messages; `openGraph` and `twitter` (`summary_large_image`,
     title, description) in the layout's `generateMetadata`. A share image only if it fits (P2).
   - Hero columns about 5 : 7. The live quad5 figure (`FigureFrame` on `/figures/drones/quad5.html`, mounted after
     first paint, `hero.svg` as the poster until `ready` and the fallback for reduced motion and no JS) at
     `min(70vh, 640px)` tall, with one hint line under it from existing strings. If the live figure can't be made
     solid in the time, make the plate a link to `/en/boards/uno-r3` and keep the SVG.
   - First visit: one primary ("Start with the Arduino Uno R3"), one secondary ("Browse the boards"); no "Continue"
     section, no dashed progress box. Returning learner: the primary becomes "Carry on: <next lesson>" with the
     last-finished line under it, and overall progress is one quiet line ("1 of 613 done") under the CTAs.
   - Lab cards: the whole card is one link (stretched link, focus ring on the card); a 4 px top rule in the lab colour
     instead of the full band (as About's cards do); title, count line ("83 lessons and assemblies"), one sentence;
     the progress bar only once something is done. Grid `lg:grid-cols-3`, one column below (SH B2 at 768).
   - Keep the "In every lab" row as it is.
7. **P1 S7 Small pages**: About (licence in `<details>`, one measure, a second column at `xl` with the three
   originals, no closing tagline: SH U16); 404 `[lang]/not-found.tsx` (no card: h1, one line, primary "Back to the
   dashboard", the three labs as one row of links: SH U14); Passport and Verify not set up get a secondary "Back to
   the labs" (SH N1); every one of them in `.frame`.
8. **P1 S8 Untranslated notice** [SH N4]: `UntranslatedNotice` gets `variant?: "block" | "chip"`. `chip` = a
   `role="note"` inline chip whose visible text is the title (`untranslated.title`) and whose body is its tooltip and
   `aria-describedby` text. Surface pages render the chip in `WorkspaceBar status` (they pass it; you only build it).
   `e2e/boardlab.spec.ts:179` looks up `getByRole("note")` by the title text: that keeps working.
9. **P1 S9 Logo in dark** (`Logo.tsx`): strokes from `currentColor`/`--line`, so the mark keeps its outline (SH U10).
10. **P2 S10** the `opengraph-image` (1200 × 630 from `hero.svg` on paper with the wordmark); `/en/together` is
    F-build-panels'.

### 1.10 Where the reports disagreed, and what this spec chose

- **Where the dock goes.** PA B1 wants a 48 px icon rail with a side panel, FE U3 a "Tools" tab in the workspace rail.
  Chosen: a "Lab tools" button in every workspace bar opening a drawer over the rail (§2.4 PN1). It needs no extra
  grid column on four page types, it is one placement on desk and phone (so no floating pill over the figure or the
  touch sticks), and the figure stays in view while the partner or the optimiser acts on it.
- **Duplicate controls.** FE U5 would remove the host's See-through, Exploded view and Wiring sheet; BO U3 would keep
  them. Kept: the host bar holds the keyboard shortcuts (T, X), the translations and the e2e anchors; the figure's
  copies are figure-owned and go with an engine switch (§5).
- **The lesson strip.** R 19 suggests a row of 16 numbered chips; BO U1 a picker. Chosen: the picker, because the bar
  has no room for 16 chips beside a German title.
- **The plate in dark mode.** R 10 calls the light plate right; FE U14 calls it a bright block. Both hold: the plate
  stays light paper (SPEC), and gets a light ink frame so it reads as an object, not a hole.
- **Phone figure.** BO B2 wants the figure at nearly full height, RO 4 sticky at 45 %, DR B1 68 %. Chosen: sticky at
  46svh by default (the figure and the step you act on share the screen), 56svh on the drone workshop where the craft
  is small, and the full screen on the fly page.
- **Mono.** Four audits ask for sans UI text; R 6 and R 7 praise the mono readout and kicker. Both kept: sans for
  words, mono for numbers, code and the one kicker.

---

## 2. Per-surface task lists

Every surface: adopt the frame first (P0), then the rest. Pass `tone` to the bar. Put `<LabDock …/>` in the bar's
`actions` (last), `<SoundToggle compact />` before it, the shortcuts button as `IconButton icon="keyboard"` with the
existing "Keyboard shortcuts" string as its label and `aria-keyshortcuts="?"`, hidden on coarse pointers
(`[@media(pointer:coarse)]:hidden`). Delete `<UsageToggle />`. Move `UntranslatedNotice` into the bar as
`variant="chip"`: the page file that renders it today passes `<UntranslatedNotice variant="chip" …/>` to its workspace
as a `notice` prop (a server element is a valid prop of a client component), and the workspace puts it in `status`.
Nothing may sit between the site header and the workspace frame, or the frame's bottom falls below the fold.

Placement rules for every stage: at most one toolbar row above the plate (view switches, cockpit controls), at most
one 32 px readout row or one `StageDrawer` below it. Messages about the figure (notices, "Here's why", empty states)
are overlays inside the plate, never rows under it. Controls that change the model (Do it, Trigger, Run) live in the
rail; the stage toolbar is for how you look at it and, on the fly page, how you fly it. The one exception is an empty
state's single action on the plate (DR4).

### 2.1 F-build-boards (`src/components/boardlab/**`, `src/app/[lang]/boards/**`, `boardlab.json`, `e2e/boardlab.spec.ts`)

1. **P0 BL1 Lesson workspace** (`LessonWorkspace`) [FE B2 U1, BO B1 U1 U13 nit 2]: `WorkspaceFrame` with
   `className="[--rail-w:clamp(24rem,34vw,38rem)]"` (490 px at 1440, 608 at 1920: room for 55-character code
   lines), `data-testid="lesson-workspace" data-lesson` on it.
   - bar: back to the board, kicker "Lesson 2 of 16", title, Done pill (`data-testid="lesson-done"`), the lesson
     picker (BL4), actions.
   - stage: `ViewBar` (BL5), `FigureFrame fill`, then one 32 px row with `FigureReadout` and `PinReadout` as a
     `StatStrip`/chip row (keep their testids and `data-pin`).
   - rail: one `Panel`, `CodePanel` on top (`flex-1 min-h-64`), under it a `Tabs fill` taking about 45 % of the rail:
     **Serial** (default; `SerialMonitor`) · **Checks** (badge `n/N`) · **Break it** (`FailurePanel`) · **Quiz** (when
     the lesson has one, moved out of `LessonInfo`) · **Inputs** (`WorldPanel`, when the lesson has inputs) ·
     **Parameters** (`ParamPanel`, when it has parameters). Run selects Serial; a finished check run sets the badge.
     Labels from existing strings where they exist (panel headings); add a key only for a tab with no string.
   - below: `LessonInfo` (now without the quiz) at `max-w-[72ch]`, `WireInPanel` for this lesson's parts (BL7) beside
     it at `xl`, then prev/next.
   - The fault now fires beside the figure: this is the pitch's 0:15 beat ("LED with no resistor", Trigger). Check it
     at 1440 with the figure and the row in one screenshot.
2. **P0 BL2 Break it rows** (`FailurePanel`) [BO B1 U6, FE B2 U13]: one row per fault (kind chip, title, `secondary
   sm` "Trigger"), `divide-y`, the open row keeps What you see / Why / Fix word for word. The active fault's row gets
   the tomato start bar and its button becomes `danger` "Repair". Faults that name a part in `lesson.circuit` come
   first; the rest go under a "More faults on this board" disclosure (only if the failure data names its part;
   otherwise keep the order and say so in your report). Keep "LED with no resistor" and "5 V capacitor fitted
   backwards" visible without opening anything on `uno-r3/blink`.
3. **P0 BL3 Board page** (`BoardWorkspace`) [BO B1 U2, FE U1]: `WorkspaceFrame`, `data-testid="board-workspace"`.
   stage: `ViewBar` + `FigureFrame fill`. rail: tagline (two lines max), `ProgressBadge`, one primary "Start: <first
   lesson>" / "Continue: <next lesson>", then `Tabs fill`: **Lessons** (default; the 16-row list as dense rows with
   number, title, done tick; `data-testid="board-lessons"` with its `li`s) · **Assembly** (`assembly-panel`) · **Break
   it** · **Key facts** (a two-column `dl` without filled cells, with On-board controls under it). below: an in-page
   `Tabs` for **Pinout · Wire it in · Power and limits · Sources**. `e2e/boardlab.spec.ts` lines 66–70 click the
   Assembly tab and the Pinout tab before their assertions. Assembly's "Do it" now animates a figure that is on screen.
4. **P0 BL4 Lesson picker** [BO U3 U4, FE U12]: in the bar, `‹` and `›` IconButtons (prev/next lesson, existing
   strings) around a `Popover` trigger reading "2 / 16" whose panel holds the lesson list (numbered rows, done ticks,
   current marked, `data-testid="lesson-strip"` moves onto it). The `[` `]` and `1…0` shortcuts keep working. The
   "Lessons 0/16" heading goes; done count lives in the picker ("Done 3/16" kicker in the panel) and `lesson-progress`
   moves there. Remove `LessonStrip` from the page flow.
5. **P0 BL5 ViewBar** [BO U3 U10 U12, FE U5 nit 6]: one row, `flex-nowrap overflow-x-auto`, fixed order: views
   `SegmentedControl size="sm"` (Board / Breadboard / Schematic / Power tree) · Exploded view · See-through · the turn
   group (`IconButton size="sm"` rotate-left / reset / rotate-right, existing titles as labels) · the variant switch as
   a compact `SegmentedControl` or `Select` (moved out of its full-width bar: BO U2) · the power `Select`. The host
   "Running" pill stops being drawn: it becomes an `sr-only` live region that keeps `role="status"` and
   `data-testid="board-status"`; the figure's STATUS, the serial header and the Run button carry the state on screen
   (FE U4.4, BO U3 U15). Keep See-through and Exploded view (the pitch clicks them; T and X need a target) and
   `data-testid="viewbar"`.
6. **P1 BL6 One run state** [FE U4, BO U15]: the serial header reads "Stopped · Your code isn't running yet" before
   Run (one new string or reuse), and when the board loses power (a short, a reversed supply) the run stops: the Run
   button goes back to Run, the serial header to Stopped, and the monitor prints "Board lost power" (`serial.lostPower`
   in six languages). If the run state lives in `src/lib/boardlab/**`, you own those files for this task (§5).
7. **P1 BL7 Wire it in** [BO U5, FE U1]: on a lesson only the parts in `lesson.circuit`, with a link "All parts on the
   <board> page"; on the board page each part a one-line row (name, supply, Inspect) that opens to its pin table and
   its Careful callout. Keep `data-testid="wire-panel"`.
8. **P1 BL8 Code panel** [BO U14 U13]: toolbar order fixed `Run · Reset · Copy · Expand`; Run primary (the area's one
   primary), the other three `IconButton size="sm"` with tooltips, Reset disabled until edited, the EDITED tag after
   the title so nothing moves. Soft wrap only under `sm`.
9. **P1 BL9 Checks** [BO U16]: "Run checks" until the first result, then "Check again" (`checks.run`, six
   languages); the lede hides once results exist.
10. **P1 BL10 Phone** [BO B2 U11 U18, FE U12]: with the frame the order is bar → sticky figure → rail (code with Run
    right under the figure). Tabs `phoneGrid`, rail tablist `ws-sticky-tabs`. The serial resize handle gets a 44 px
    hit area around its grip; the colour swatches 24 px (44 on coarse). `LessonInfo` tabs `phoneGrid`.
11. **P1 BL11 Index** `/boards` [BO U7 U8]: `.frame`; grid `repeat(auto-fill,minmax(18rem,1fr))`; drop the "FIG. n"
    kicker (there is no picture to promise); spec cells as one mono line ("ATmega328P · 16 MHz · 5 V · 32 KB"); the
    data glitches: Verilog once, "2.4 GHz", NodeMCU's chip cell to one line, "○ Assembly" → "Assembly not done" /
    "✓ Assembled". Progress bar only once started; before that one muted count line.
12. **P2 BL12 Quiz rows** [BO U17]: each option a full-width 44 px `label` row; right and wrong with the Checks fills.
13. **P2 BL13 Boxes** [BO U6]: any card left inside a Panel becomes a `divide-y` row.

### 2.2 F-build-robotics (`src/components/robotics/**`, `src/app/[lang]/robotics/**`, `robotics.json`, `e2e/robotics.spec.ts`)

1. **P0 RB1 Bench workspace** (`BenchWorkspace`, `[bench]/page.tsx`) [RO 1 3, FE U1, PA B1]: `WorkspaceFrame`,
   `[data-bench-page]` kept.
   - bar: back, kicker, title (the 52 px h1 becomes the bar title), the sub as the kicker's second half or one muted
     line, `ProgressBadge size="xs"`, the board link, actions (Sound, "Go into the figure" as `IconButton icon="target"`
     with `shortcut="F"` and the existing label, Keyboard shortcuts, Lab tools).
   - stage: `FigureFrame fill`; the notice (`role="status"`, `aria-live`, `data-notice`) as an overlay at the plate's
     bottom (`absolute inset-x-3 bottom-3`), so "No power: USB-B socket is missing" shows on the figure; the selected
     part as a one-line chip overlay at the top start only when something is selected (keep an empty
     `[data-selected-part]` element in the DOM when nothing is); the serial monitor in a `StageDrawer` (closed shows
     the last line; `S` opens it and focuses `[data-serial]`).
   - rail: a 3–4 stat `StatStrip` pinned at the top (status, the bench's main reading, current), then `Tabs fill`:
     **Steps** (default, badge `3/25`) · **Break it** · **Status** (`StatusPanel` with the meters) · **Quiz**.
     `e2e/robotics.spec.ts:87` clicks Status before checking the Live status heading and the meter.
   - below: "About this bench" (the overview paragraph and sources; keep the `sr-only` overview h2), Modes, Practice
     tasks, prev/next.
2. **P0 RB2 Units** [RO 2]: after the shell's `Meter` change, shorten meter labels to the supply ("USB · 5 V") and move
   the limit sentence ("500 mA through the polyfuse") into the line under the bar. Check every kicker that can hold a
   unit or part number and switch it to `.ink-label`.
3. **P0 RB3 Steps** [RO 5 6, R 14]: one Panel, rows `divide-y`; row 1 number + kind chip + status, row 2 the title at
   full width; the current step has a 4 px ink start bar, its "Do it" is the rail's one primary; done steps one muted
   line with a tick; later steps title-only and tappable. Keep "Do it", "Do this in the figure", `[data-step]`, the
   `N` key, the out-of-order refusal text.
4. **P0 RB4 Faults** [RO 1 5]: a dense list, kind chip, title, `secondary sm` "Trigger"; tomato fill and the Active
   chip only on the active fault; "Why it happens" opens on the row. Keep "Trigger" and the faults PITCH points at
   ("LED in backwards" on `led-resistor`, the backwards 47 µF capacitor).
5. **P1 RB5 Phone** [RO 4]: the frame gives bar → sticky figure (notice overlaid) → rail. Rail tablist
   `ws-sticky-tabs`, `phoneGrid` if four labels don't fit.
6. **P1 RB6 Index** [RO 7]: `.frame`; at `lg` each month is a row: a 13.75 rem left column (the month h2, a one-line
   summary, the month's progress) and its cards in a 3-column grid on the right; single-card months read as a
   timeline. Before a bench is started, one muted line ("25 steps · 2 tasks · 5 quizzes") instead of an empty bar.
   Keep the six h2 and `article[data-bench]` with one link each.
7. **P1 RB7 Small fixes** [RO 8 12]: `first-letter:uppercase` on the sub and hint; "Practice tasks" h2 at the panel
   size; locked quizzes show a `lock` icon and the unlock text instead of five grey buttons.
8. **P2 RB8 Reference solution** [RO 11]: "Reference solution loaded" with an "Undo" that restores the text.
9. **P2 RB9 First step vs figure** [FE U4.3]: if the bench can send the figure step 1's state when it is ready (the
   way boards pass `initial`), do it; otherwise leave it and say so.

### 2.3 F-build-drones (`src/components/dronelab/**`, `src/components/flight/**`, `src/app/[lang]/drones/**`, `dronelab.json`, `flight.json`, `e2e/dronelab.spec.ts`, `e2e/fly*.spec.ts`; plus `src/lib/flight/**` and `src/lib/dronelab/**` for this pass, §5)

1. **P0 DR1 Fly: Break it crashes** [FE B1 — blocker; the "most entertaining" beat in VIDEO.md]. With "Mount the
   flight controller backwards" on, Arm, hold W: today the craft skates along the ground at 58 A, never crashes and can
   drive off the map. `src/lib/flight/flight.test.ts` "flips on take-off" passes with sticks set directly, so first
   write a failing test that takes the page's path (the Break it switch → `src/lib/dronelab/fly.ts` faults → the sim,
   with keyboard throttle ramping in angle mode) and fix where it diverges. Likely spot: `sim.ts` rolls the craft once
   `s.u² > 0.05` but a flipped craft on the ground never counts as a crash; count a flip past 90° (or ground contact
   with `flipWhy` set) as a crash with that `why`, so the slow-motion replay and "Here's why" run. Also crash (or reset
   to the pad) when the craft leaves the range or sits on the ground above ~60 % throttle for more than 2 s. Verify in
   the browser: switch on, Arm, W: flip, replay, why, "Turn the flight controller round", Arm, flies.
2. **P0 DR2 Fly cockpit** (`FlyWorkspace`, `FlightRange`) [DR B3 U2 U5 U12, FE U1 nit 5]: `WorkspaceFrame` with
   `phoneStage="full"`.
   - bar: back to the bench, kicker, title, then Sound, Keyboard shortcuts, Lab tools.
   - stage: first a 44 px cockpit row (the same place as the boards' view bar): the flight-mode `Select` (keeps "Demo"
     and every mode), **Arm** (the stage's one primary), "Reset to the pad", FPV, Wind (`secondary` with
     `aria-pressed`), Gamepad and Controls as `IconButton`s opening `Popover`s over the range (not panels that push the
     page down). Then the range `fill`; telemetry as one `StatStrip` overlaid on the range's bottom edge (paper chip
     background, 12 px labels, 18 px tabular values, `nowrap`): State · Battery · Alt · Speed · Throttle · Current ·
     mAh · Next · Lap/Best · Crashes. Medal times only on the course rows. This also fixes axe's `definition-list` on the fly page;
     add `expectNoAxeViolations` to `e2e/fly.spec.ts` once it passes. The "Here's why" card as an overlay inside the
     range, bottom start, `max-w-[26rem]`, its fix button primary; it leads with the immediate cause, then the root
     ("Hit a gate post, because the flight controller was mounted backwards…": DR U15).
   - rail (scrolls): Courses (best and medals) → Break it → Flying this design + Arming rules (collapsed to one line
     "8 of 8 OK" that opens; keep `data-testid="arming-rules"` on the list) → Daily challenge (the full card only on its
     own craft, else one line at the bottom: DR U12) → Leaderboard (`Callout variant="quiet"` when not set up).
   - Keep WASD, the arrows, Space, V, R, crash replay, ghosts, every testid.
3. **P0 DR3 Workshop** (`DroneWorkspace`) [DR U1 U6 U8 U15, FE U1 U5]: `WorkspaceFrame`.
   - bar: back, kicker "Fig. 01 · Freestyle · Betaflight 2026.6.2", title, `ProgressBadge size="xs"`, actions: **Fly
     it** (primary, `data-testid="fly-link"`; the readiness note becomes its `Tooltip` and stays the
     `aria-describedby` target with id `fly-note-<id>`, visually hidden), Sound, Keyboard shortcuts (`keyboard` icon,
     not `info`: DR N1), Lab tools. "Use the figure" becomes `IconButton icon="target" shortcut="F"`, hidden on
     coarse pointers (DR N2).
   - stage: a 40 px toolbar row (Bench / Wiring sheet, Exploded view: disabled while the sheet is shown, DR U6),
     `FigureFrame fill`, the Betaflight log in a `StageDrawer` (`data-testid="figure-log"` stays mounted). The status
     row (parts / battery / fault) becomes three compact readouts in the toolbar row, keeping
     `data-testid="bench-status"`. The host's figure-flash line becomes `sr-only` (the figure shows its toast: DR U15).
   - rail: the existing six tabs, `Tabs fill phoneGrid` (DR U16).
   - below: "Meet the …" and the practice task.
4. **P0 DR4 Empty mat** [FE U6, R 13]: while no part is fitted and the figure is ready, an overlay centred on the
   plate: "No parts fitted yet", primary "Build it for me", secondary the first part's fit action. The judge sees a
   drone in one click.
5. **P1 DR5 Arming rules** (`src/lib/dronelab/fly.ts`, `bench.ts`) [DR U3 U4]: `flyRules()` takes `state.breaks`, so a
   broken item shows a tomato "Broken on purpose" chip and `acc` blocks in the list as it blocks Arm; the capacitor
   rule names the craft's own power lead (`parts.XT60.short`), a rule for a test the craft doesn't have is left out.
6. **P1 DR6 Break it rows** [FE U16]: the whole row is the switch's label.
7. **P1 DR7 Phone** [DR B1 B2, FE U11 U9]: workshop: bar → sticky figure (`[--stage-h:56svh]` on the frame) → tabs.
   Fly (`phoneStage="full"`): the cockpit row and the range fill the screen under the bar, so Arm is in reach of the
   sticks; on the phone the row keeps the mode `Select` and Arm, and Reset, FPV, Wind become 44 px icon buttons; the
   sticks as 30 %-opacity rings with no fill in the bottom corners, their labels in dark ink on a paper chip; the HUD
   as a three-column strip of 18 px values. The dock is now a bar button (PN1), so nothing floats over the sticks.
8. **P1 DR8 Wiring** [DR U7]: each wire a row: `FROM → TO` as two `whitespace-nowrap` text buttons with the kind's
   colour dot (44 px hit area), the pads in mono, the note under it; no table, no `min-w-[34rem]`. Keep
   select-both-ends and the legend.
9. **P1 DR9 Design tab** [DR U9 N6]: one `Select` per row (label 7.5 rem on the left, the select filling the rest), so
   "6S 1100 mAh LiPo" is never cut; tiles as a `StatStrip` (keep `data-testid="design-tiles"` and the tile labels
   VIDEO.md reads: All-up weight, Thrust : weight, Hover throttle, Hard-flying time); de `design.tiles.flyMin` shorter.
10. **P1 DR10 Tests** [DR U10]: a refused test shows its reason in its own row (`role="alert"`, tomato start bar) with
    a one-click fix where the host knows it ("Take the props off").
11. **P1 DR11 Native controls** [DR U13, FE U17]: mode select, gamepad selects → `Select`; ghost toggles and gamepad
    Invert → `Toggle`; the ghost toggles were 13 × 13 (R 18); the Controls legend as `Popover` content, not a fourth
    card style.
12. **P2 DR12 Index** [DR U11, FE nit 10]: `.frame`, `repeat(auto-fill,minmax(17.5rem,1fr))`; drop the hashtag row;
    progress as a 3 px line along the card's bottom only once started; phone cards compact (~140 px); keep the palette
    band and "Fig. 01"; one intro sentence, not two.
13. **P2 DR13 Console tokens** [DR N9]: `--console-*` from §1.1 in `DroneWorkspace` and `CliConsole`.

### 2.4 F-build-panels (`src/components/{ai,dock,search,realtime,hw,data,figure}/**`, `src/app/[lang]/together/**`, `ai.json`, `search.json`, `together.json`, `hw.json`, `e2e/dock*.spec.ts`; plus `e2e/dock-shared.ts`, §5)

Do PN1 first and commit it within the first 20 minutes: the three lab builders place `<LabDock>` in their bars.

1. **P0 PN1 The dock is a bar button and a side drawer** (`LabDock.tsx`) [PA B1 B2 U5 U10, FE U3 U9 U10, DR B2,
   BO B2]: `LabDock` renders, where it is placed, a trigger: `Button variant="secondary" size="sm"` with the `tools`
   icon and the visible text "Lab tools" (`dock.label`) from `sm`, icon-only below; its accessible name stays "Open lab
   tools" (`dock.open`; the visible text is inside the name, WCAG 2.5.3), `aria-expanded`, `aria-controls`, a small
   mint dot while you are in a room.
   - Desk (≥ 768): the trigger opens a non-modal drawer portaled to `body`: `<aside aria-label="Lab tools">`, `fixed
     end-0 top-(--header-h) bottom-0 z-30 w-[min(26rem,calc(100vw-3rem))]`, `bg-surface border-s-2 border-line
     shadow-ink-lg`, `animate-ink-from-end`, a header row with the title and a close `IconButton` (`dock.close`), then
     the three tabs with `Tabs fill`. It overlays the workspace rail and leaves the figure in view, so the partner can
     point at the LED while you see both (PITCH 0:35), and "Use this build in the lab" visibly changes the craft.
     Escape and × close it and return focus to the trigger; no scrim, no focus trap. The drawer carries
     `data-testid="lab-dock"`, `data-ready`, `data-layout="desk"`.
   - Phone (< 768): the trigger opens the existing `Sheet` (`height="full"`, tabs `phoneGrid`); the sheet content keeps
     `data-testid="lab-dock"`, `data-layout="phone"`. **No floating pill any more.**
   - Opens on the first tab that works: Partner when AI is on; otherwise Together on boards and benches, Build it for
     real on drones (PA U1, FE U10). Closed by default; `?room=` opens it on Together with focus in the name field (PA
     B2 N2).
   - `e2e/dock-shared.ts` `openDock(page, phone)`: click `getByRole("button", { name: dockCopy.open })` in `main`, then
     return the drawer (desk) or the dialog (phone). `room.spec.ts` and `fly-fun.spec.ts` use the helper and need no
     change of their own.
2. **P0 PN2 Calmer panels** (`PartnerPanel`, `RealBuildPanel`, `TogetherPanel`) [PA U1 U7 U8 U11]: the drawer is the
   only box: no partner frame border, no dashed intro box, no dock hint line, no `PanelHead` title that repeats the tab
   name (keep the lede); the partner's off state compact (no `min-h-[24rem]`, about 120 px); four type styles (kicker,
   body sans 14, strong sans 14/600, figures mono 16/700 tabular, 24 for the one total); nothing under 12 px; the room
   code row `max-w-[16rem]`.
3. **P0 PN3 Search off, said once** (`RealBuildPanel`, `NearbyPanel`, `VideoHelp`) [PA U2, FE U7]: when search is
   off, one `Callout variant="quiet"` at the top of the tab with the existing `real.notSetUp` text (PITCH quotes it),
   and Near you and Video help are not rendered.
4. **P0 PN4 No $0.00** (`RealBuildPanel`) [PA B3]: when no line is live and none has an `estimate`, a plain parts
   checklist (name, quantity), no price column, no "No listing found", no total card. With catalogue estimates only
   (drones): "Catalogue total" and no "US stores" footnote (PA N3, one key in six languages); "Cheapest total" stays for
   live prices (VIDEO.md).
5. **P1 PN5 Room join flap** (`LabRoom.tsx`) [PA U3]: one stable proxy store for the page's life, so the join effect
   never sees a new `store`; a guest joins once.
6. **P1 PN6 Figure host** (`FigureFrame`) [R 12]: if F-build-shell added `fill` in phase 3, check it on all five lab
   pages; add a visible loading state (the plate with the figure's title and a quiet "Loading the figure…" line, no
   spinner) and a Retry button on the failed state. If `fill` is missing, add it first thing (§1.9 S3).
7. **P1 PN7 /together** [PA U12, SH U9, FE U17]: `.frame`; Start and Join side by side, equal height, no empty space;
   when AI is off, Build Buddies and the Build Night planner as one quiet line ("… need the AI service, which isn't set
   up on this deployment."); the Boards / Robotics / Drones control `stretch`; `Select` and `TextInput`.
8. **P2 PN8 Budget range** [FE U8]: the optimiser slider from the cheapest combination the calculator accepts to about
   1.5 × the current build, with the floor labelled.
9. **P2 PN9 Room nits** [PA N4–N8]: "Your current build" when the upgrade equals the pick; Together's lede without the
   translation promise when it's off; one line for the stacked "not set up" notes in a room; hide the mic when voice is
   off; "Join the room" enabled with an inline error; "Change name" in the room bar.

---

## 3. Fresh-eyes ledger (every blocker and ugly has an owner or a reason)

| Entry | Owner and task | Note |
|---|---|---|
| B1 fly Break it never crashes | drones DR1 | P0 |
| B2 board Break it off screen | boards BL1, BL2 | P0 |
| U1 lab pages aren't workspaces | shell S1–S3; boards BL1 BL3; robotics RB1; drones DR2 DR3 | P0 |
| U2 German header | shell S4 | P0 |
| U3 sponsor panels at the bottom | panels PN1 | P0 |
| U4 run state contradicts itself | boards BL5 (pill) BL6 (power loss); robotics RB9 (step 1 vs figure) | the figure's toast over RUNNING is figure art: left |
| U5 duplicate controls | boards BL5, drones DR3 (host side) | the figure's own See-through, Break it ▾, Exploded view and pill stack are drawn by `figures/**`: left (out of scope); the host keeps its controls because the keyboard shortcuts and translated labels live there. Driver: an engine switch to hide the figure's chrome when embedded (DR B1.2) |
| U6 empty mat, no pictures | drones DR4 | catalogue posters: left. No stills exist; rendering 38 with `cfshoot.py` into `public/posters/` is figure tooling no builder owns and more than the hour. Cards are trimmed to read complete without one (BL11, RB6, DR12) |
| U7 "Live prices" on maps and videos | panels PN3 | |
| U8 budget range $330–$370 | panels PN8 | P2; BUILD-PLAN §1 step 3's "$150" is the driver's |
| U9 phone pill covers content | panels PN1 | the pill is gone |
| U10 phone sheet tab cut, opens on "not set up" | panels PN1 | |
| U11 phone fly sticks, Arm, HUD | drones DR7 | |
| U12 phone lesson Run 2.4 screens down | boards BL1 BL4 BL10 | |
| U13 Break it list generic; designators | boards BL2 | the figure's designator names and the missing "LED in backwards" board fault: driver (figure strings, content, BUILD-PLAN §1 step 1) |
| U14 dark figure without frame | shell S1 (`--plate-frame`) | |
| U15 landing zeros | shell S6 | |
| U16 fly Break it row title | drones DR6 | |
| U17 native selects, checkboxes, widths | shell S1 S2; drones DR11; panels PN7 | |
| nits 1, 7, 11 | left | Blink passing untouched is lesson content (`src/content/boards/uno-r3.ts`, not a builder's); "Press RESET" in English and opening Blink zoomed are figure-owned |
| nits 2–6, 9, 10 | frames; BL5 BL8; DR2; S4 S5 S6; DR12 | |
| nit 8 chase camera loses the craft | left | camera tuning in `FlightRange`; drones may take it as P2 if everything else is done |

Audit blockers, for completeness: SH B1 → S4; SH B2 → S2 + S6; SH B3 → driver (§5); BO B1 → BL1–BL3; BO B2 → BL10 +
PN1; RO 1 → RB1; RO 2 → S2 + RB2; DR B1 → DR3 DR7 (+ the engine switch, driver); DR B2 → PN1 + DR7; DR B3 → DR2;
PA B1 B2 → PN1; PA B3 → PN4. Left on purpose: PA U4 (two tabs share one identity: `src/lib/realtime`, nobody's this
pass), PA N9 (the Hardware tab stays off: Amar kept hardware out), RO 9 and DR engine notes (figure strings and the
figure HUD's "OFF"), RO 10 (the figure stays one tab stop behind "Go into the figure"; reordering the DOM risks the
e2e paths for little gain).

---

## 4. What not to change

Every audit lists these as working; keep them exactly:

- **The look**: paper and grain, 2 px ink lines with the offset shadow on primary buttons and plates, hand-cut
  `--radius-ink` corners, Newsreader titles, the five palettes and the monochrome, light plates in dark mode, the
  focus ring, both reduced-motion paths, `.ink-prose` at 68 ch, `.ink-kicker`.
- **Copy**: board taglines, power limits, pin notes, fault explanations (What you see / Why / Fix, with the arithmetic),
  the quiz reasons, "Nothing printed yet. Press Run.", "No design saved for this craft yet", the honest "not set up"
  sentences, "Nobody has to build alone". Restyle them; don't reword them (except the strings this spec names).
- **Behaviour**: Run → Compiling → Uploading → Running and the checks; the syntax error line; Break it and Repair; the
  `?` dialogs (all three) and every shortcut (X, C, B, Space, Q/E/R, T, F, Esc, N, S, `[`, `]`, `1…0`, WASD, arrows,
  Space, V, R); Assembly's out-of-order refusal; Inspect; the parameter chips; the bench's steps, break-and-fix,
  quizzes on time, practice tasks with per-check rows; the drone calculator, the build flow, the CLI emulator, the
  three tests; crash replay at ⅓ speed with "Here's why" and the one-click fix; FPV OSD, ghosts, medals, the daily
  challenge share link; rooms on the broadcast transport, the invite QR, the optimiser on catalogue prices; the theme
  and language behaviour (no flash, path kept, cookie, Back); the phone menu's focus handling; the skip link; the
  localized 404.
- **The landing**: the serif display face with mono kickers, the hero's direct path into lesson 1, the "In every lab"
  row.
- **Labels the presenter clicks** (VIDEO.md, PITCH.md): Run / Ejecutar, See-through, Exploded view, "LED with no
  resistor", "5 V capacitor fitted backwards", Trigger, Repair, Running, "All checks pass. Lesson done.", Break it,
  Partner, Together, "Build it for real", "Open lab tools", "Grabar un mensaje de voz", the Battery select and the four
  tile labels, "Cheapest total" (live prices), Budget, "Best build within …", "Use this build in the lab", Search,
  Makerspaces, Flying fields, Maker events, Flight mode "Demo", Arm, "Reset to the pad", "Mount the flight controller
  backwards", "Turn the flight controller round", Build Story, "Write our Build Story", Share, Download PNG, "Do it",
  "Do this in the figure", "Take the quiz", "Run checks", "Keyboard shortcuts" (as the accessible name), "Solder the
  through-hole joints". A label you must change goes in your report as old → new.
- **Tests' anchors**: every `data-testid`; robotics' `article[data-bench]`, six index h2, `[data-bench-page]`,
  `[data-step]`, `[data-notice]`, `[data-selected-part]`, `[data-supply]`, `[data-quiz]`, `[data-quiz-score]`,
  `[data-serial]`, one iframe per page, a `role="meter"`; the dock's tab names; the untranslated `role="note"`.

---

## 5. Ownership notes and requests for the driver

- **Granted by this spec for this pass** (no other builder touches these in phase 4): `src/lib/flight/**` and
  `src/lib/dronelab/**` → F-build-drones (DR1, DR5); `src/lib/boardlab/**` run state → F-build-boards (BL6 only);
  `e2e/dock-shared.ts` → F-build-panels (PN1); `src/app/[lang]/not-found.tsx` → F-build-shell (S7);
  `src/components/figure/FigureFrame.tsx` → F-build-shell in phase 3 for the `fill` prop only (S3), back to
  F-build-panels in phase 4. If the driver disagrees with any of these, the fallback is written into the task.
- **Driver, routing (SH B3)**: in `next.config.ts` `redirects()`, after the `/` rules, send language-less sections to
  a language: `source: "/:section(boards|robotics|drones|about|together|passport|verify)/:rest*"` with the same three
  steps as `/` (cookie, `accept-language`, English) to `/:lang/:section/:rest*`. A styled root 404 needs Next 16's
  `global-not-found` (read `node_modules/next/dist/docs/` first: it may need an `experimental` flag in the same file).
- **Driver, figure engine** (out of scope for builders): a `set {chrome: "min"}` message in `figures/engine/embed.js`
  that hides the figure's own pill stack when embedded (keeps See-through, Labels, zoom and the HUD) would remove the
  last duplicates (FE U5, BO U3, DR B1 U8); fit the wiring sheet to the plate (DR U6); "Press RESET", "OFF" and the
  designators in the figure dictionaries; the build-for-me toast that claims the tests ran (DR U10).
- **Driver, content**: BUILD-PLAN §1 step 1 ("Reverse the LED") and step 3 ("under $150") against what exists (FE U8,
  U13); Blink passing untouched (FE nit 1).
- **Posters** for the catalogues and the landing's lab cards stay out of this pass (§3, U6).
