# P2-microbit → driver: micro:bit "Build it for real" kit

Owner: driver (`src/lib/search/bom.ts` has no wave-B owner).

## What

In `BOARD_KITS` (`src/lib/search/bom.ts`, line ~351), give the micro:bit the parts its lessons use:

```ts
"microbit-v2": { board: "BBC micro:bit V2", cable: "usb-micro-b", extras: ["aaa-pack", ...STARTER, "potentiometer"] },
```

## Why

The kit lists only the battery pack today. The five lessons (`src/content/boards/microbit-v2.ts`) wire an LED
through a 470 Ω resistor on ring 1 (blink, buttons, dimmer) and a 10 kΩ potentiometer on ring 2 (dimmer) on a
breadboard with leads from the rings, so the learner needs breadboard, jumpers, LEDs, resistors and a potentiometer
to build them. All keys already exist in `PART_QUERIES`, so no new `part.<id>` label is needed in `search.json`.

Optional, if you add a query key (and its `part.<id>` label in every locale's `search.json`): crocodile-clip to
jumper leads (`"croc-leads": "crocodile clip to male jumper leads"`), which is how the rings are usually wired, or an
edge-connector breakout for P3-P20.
