# UI

How the interface is made, and the rules a change has to keep. The guard in `scripts/ui-check.mjs` checks most of them.

## Design values

- Type: Geist for all text, Geist Mono only for code, serial output, numbers that change and data tables. Weights 400, 500, 600 and 700. The Tailwind default size scale and nothing else. No italics. Labels are sentence case `text-xs font-semibold text-muted` (the `kicker` class).
- Spacing: 0, 2, 4, 8, 12, 16, 24, 32, 40, 48, 64, 80 and 96 px, which are the Tailwind steps 0, 0.5, 1, 2, 3, 4, 6, 8, 10, 12, 16, 20 and 24.
- Radius by role: `rounded-lg` for buttons, fields and tabs, `rounded-md` for chips and kbd, `rounded-2xl` for panels, dialogs, popovers and the dock, `rounded-xl` for figure plates. `rounded-full` only on dots and the switch.
- Colour: chrome uses `ink`, `muted`, `rule`, `accent` and the state tokens `good`, `bad`, `warn` and `info`. Dark surfaces come only from the token file. The palette tones are for figures and data colours.
- Shadow only on floating layers (nav bar, popover, menu, dialog, sheet, dock): `shadow-md` or `shadow-lg`. Panels are a fill plus a 1 px `--rule` border.
- Motion: `motion-move`, `motion-fade` and `motion-press`, on the `ease-iynk` curve. Never animate width, height, top, left or inset. Under reduced motion nothing moves.
- z-index: the named scale `z-sticky`, `z-header`, `z-dock`, `z-overlay`, `z-popover`, `z-tooltip`, `z-skip`.
- Icons: Phosphor through `Icon`, weight regular, size 16, 20, 24 or 32. The type rejects any other size.

The tokens live in `src/styles/tokens.css`.

## Components

Import them from `@/components/ui`.

- `Button`, `ButtonLink`: the one button, in primary, secondary and quiet looks.
- `IconButton`: a button that holds only an icon and needs a label.
- `Icon`: a Phosphor glyph by name.
- `TextInput`, `TextArea`, `Select`, `FieldMessage`: form fields and their inline message.
- `Toggle`, `SegmentedControl`: on or off, and one choice from a few.
- `Tabs`, `Stepper`: switching views, and showing progress through steps.
- `Panel`, `Chip`, `Callout`, `Kbd`: surfaces, tags, notices and keys.
- `Dialog`, `Sheet`, `Popover`, `Tooltip`: layers over the page. A dialog is for confirmations and the keys dialog.
- `Menu`: a list of actions behind a button.
- `CommandMenu`: search over actions, opened with Control or Command K.
- `CodeBlock`, `tokenize`, `tokenLines`: highlighted code.
- `Meter`, `Stat`, `StatStrip`, `ProgressBadge`: numbers and progress.
- `Skeleton`, `SkeletonGroup`, `PageSkeleton`: loading shapes that match the layout.
- `EmptyState`, `InlineStatus`: nothing here yet, and a short status line next to the thing it describes.
- `Reveal`, `useRevealOnce`: a one time rise and fade as a block scrolls into view.
- `SkipLink`, `VisuallyHidden`: keyboard and screen reader helpers.
- `cx`, `useIsClient`: small helpers.

## Rules

Check each one before you open a change.

- [ ] W1 Type: the scale only, no `text-[x]`, `leading-[x]`, `tracking-[x]`, no `italic`, no weight over 700.
- [ ] W2 Spacing: only the steps above. A `clamp()` spacing becomes breakpoint steps.
- [ ] W3 Radius: by role, and an inner radius is the outer one minus the gap.
- [ ] W4 Borders: 1 px `--rule`, no `border-2`, no one sided card border.
- [ ] W5 Shadow: only `shadow-md` or `shadow-lg`, only on floating layers.
- [ ] W6 Colour: tokens in chrome. No hex or rgb in a component. Data colours stay.
- [ ] W7 Icons: `Icon` at 16, 20, 24 or 32. No inline `svg` for an icon and no glyph such as an arrow or a tick.
- [ ] W8 Motion: the three motion classes, no `ease-out`, `ease-linear` or short durations, no animated size.
- [ ] W9 Controls: no raw `button`, `input`, `select` or `textarea` unless there is a reason (a terminal input, a range slider, a native file input).
- [ ] W10 States: loading, empty, error and disabled all look right. No `window.alert`, `confirm` or `prompt`. No dead link.
- [ ] W11 Mono: `font-ui` and `font-mono` only on code, serial output, tabular readouts and data tables.
- [ ] W12 z-index: only the named scale.
- [ ] W13 Copy in code: sentence case, no exclamation marks, no new hyphenated phrase.
- [ ] W14 Keep every test id, accessible name, role and keyboard path.
- [ ] W15 Add message keys in one place, in all six languages. English copy follows the same copy rules (no exclamation marks, no spaced hyphens, no em dashes, no filler words).

## Checking your work

Run the guard:

```
npm run ui:check
```

It prints `file:line CODE text` for every hit and exits 1 if there is one. Pass paths to check only your files: `node scripts/ui-check.mjs src/components/home`. `npm run check` and `bash scripts/ci-local.sh` run it after lint. A case that has to break a rule, such as a data colour, goes in `scripts/ui-check.allow.json` with a reason.

The visual spec takes a screenshot of every screen at desktop and phone width, light and dark, and runs axe on each. It lives in `e2e/visual.spec.ts`:

```
NEXT_DIST_DIR=.next-visual npx playwright test e2e/visual.spec.ts
```

Open the screenshots in `test-results/ui-shots` and look at them. A passing spec does not mean the screen looks right.

To add a screen, add an entry to `SCREENS` in `e2e/support/visual.ts` with a name, a path and, for an overlay, a `before(page)` that opens it.

## What the rules do not cover

Figures and the simulation canvas draw their own colours, strokes and type. They are exempt from the colour, radius and shadow rules. The chrome around them is not.
