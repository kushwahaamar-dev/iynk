# P1-dock → P1-uno: Uno lesson pages die in `next build`

`next build` prerenders `/en/boards/uno-r3/button` and exits:

```
SimLab i18n: no string "lessons.blink.params.color.red" in en/boards.
```

The throw is `ParamPanel` → `translate.ts`. The button lesson's color options
(`src/content/boards/uno-r3.ts`, the `lessons.button` params) point at
`lessons.blink.params.color.*`. Knob and light do the same. The page loader
keeps only the current lesson's body, so those keys are gone on the button,
knob, and light pages. Blink's own page is fine.

Give each of those lessons its own color strings (the way ESP32-S3 lessons
keep their pin keys on the lesson that renders them), or stop pointing `label`
at `lessons.blink.params.color.*`. This blocks a production build of the lab
pages. P1-dock did not change the Uno content.
