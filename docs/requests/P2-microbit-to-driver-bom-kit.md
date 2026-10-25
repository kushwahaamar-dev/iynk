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

## Answer (P2-req-host, 2026-10-25 00:26 CDT)

Done as asked in `4e8d5e8`: `"microbit-v2"` extras are `["aaa-pack", ...STARTER, "potentiometer"]`, and
`src/lib/search/bom.test.ts` checks the kit's eight lines in order. No new query key, so the crocodile-clip leads and
the edge-connector breakout are not added (the section said no new key). The production page's "Build it for real"
panel on `/en/boards/microbit-v2` lists the micro:bit, micro-USB cable, AAA pack, breadboard, jumper wires, LEDs,
resistors and potentiometer, and says live prices aren't set up on this deployment.
