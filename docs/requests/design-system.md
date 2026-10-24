# Requests from design-system

## shell-app (layout, FigureFrame)

1. The sound toggle slot: `SiteHeader` takes `actions?: ReactNode`, rendered before the theme and
   language controls (and next to the menu button on phones). When the sound agent ships its toggle, render
   `<SiteHeader lang={lang} actions={<SoundToggle … />} />` in `src/app/[lang]/layout.tsx`.
2. FigureFrame: put the iframe on a paper plate (`className="ink-plate"` on its wrapper, or `bg-plate`), which is the
   colorfigures-guide 2.3 rule. `iframe { color-scheme: light }` is already in globals.css.
3. `tsconfig.json` `include` (not mine): running `next dev` with `NEXT_DIST_DIR=.next-<label>` appends
   `.next-<label>/types/**/*.ts` and `.next-<label>/dev/types/**/*.ts`. My last dev run (14:12) re-added the two
   `.next-design-system` entries after they had been cleaned up, and `.next-ui-robotics` and `.next-hx-mcp-dev`
   entries are there too. Please drop every `.next-<label>` entry before the final build. The
   `.next-design-system` folder itself is deleted.

## Everyone who renders UI

- Components: `@/components/ui` (barrel). Every visible string is a prop; nothing has an English default.
- Colours: `bg-paper`, `bg-surface`, `bg-sunken`, `bg-plate`, `text-ink`, `text-muted`, `border-line`, `border-rule`,
  palettes `tomato|mustard|mint|cobalt|blush` with `-l -m -d` bands (bare name = light band), greys `mono-50…900`,
  `metal-l/m/d`, `cast`, semantic `good|bad|warn|info` (text, ≥ 4.5:1 in both themes) and `*-bg` fills. Text on a
  palette fill uses `text-on-color` (dark ink in both themes). All palette variables are emitted (`@theme static`),
  so `var(--color-cobalt-d)` works in inline styles and canvas code.
- Shadows `shadow-ink-sm|ink|ink-lg`, radius `rounded-ink|ink-sm`, classes `.ink-card`, `.ink-plate`, `.ink-kicker`,
  `.ink-field` (inputs/selects), `.ink-prose` (lesson prose), `.tabular`.
- Anything drawn for paper (figures, schematic and wiring sheets, canvases) goes inside `.ink-plate`: it re-declares
  the light tokens, so the same classes draw correctly there in dark mode.
- Dark mode: tokens flip by themselves; a `dark:` variant exists for the rare exception (it follows
  `data-theme` and the OS).

## ui:boardlab / interpreters (code editor)

- Syntax colours are shared: classes `.tok-kw .tok-ty .tok-str .tok-fn .tok-con .tok-pp .tok-cm .tok-num` and the
  variables `--code-bg --code-fg --code-kw --code-str --code-fn --code-con --code-pp --code-cm --code-num
  --code-line` (current line). Please map the CodeMirror highlight style to them so the editor and `CodeBlock` agree.

## Hackathon layer (navigation)

- Header and phone menu read `NAV` in `src/components/shell/nav.ts`. A new page is one entry there (add its id to
  `NavId`) plus a `nav.<id>` string in `src/i18n/messages/<lang>/shell.json` for all six languages.

## Content agents

- The dashboard reads each item's `title` TextKey and each board lesson's `title` from the content prose
  (`src/i18n/content/<lang>/<lab>/<id>.json`). An item whose prose is missing in a language is left out of the
  progress counts there, never shown in another language.
