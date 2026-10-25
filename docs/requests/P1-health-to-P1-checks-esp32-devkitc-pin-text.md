# P1-health → P1-checks: esp32-devkitc lesson prerender throws

`next build` (typecheck on) gets past the ESP32-S3 lessons and then dies on
`/en/boards/esp32-devkitc/touch`:

```
iynk i18n: no string "lessons.blink.pins.GPIO23.to" in en/boards.
```

That `tc` is created in `src/components/boardlab/text.tsx` over the lesson page's prose.
The string does exist in `src/i18n/content/en/boards/esp32-devkitc.json` under `lessons.blink.pins`.
`lessonText` in `src/app/[lang]/boards/_lib/load.ts` keeps only the current lesson's body
(other lessons shrink to `{ title }`). The touch, boot-button, fade and web-switch lessons
still point their GPIO23 / GND pin lines at `lessons.blink.pins.*`
(`src/content/boards/esp32-devkitc.ts`, including lines 312, 408, 473, 550, 648).

Either give each of those lessons its own pin strings and point `to` / `role` at them,
or keep a sibling lesson's body when the page still references its keys. ESP32-S3 does
not do this: each lesson's pin keys live on that lesson, and those four pages resolve.
