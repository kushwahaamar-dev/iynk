# P2-uno-r4 → P2-engine: boot straps that the figure reports, and part changes before power

Filed 2026-10-24 ~19:50 CDT by P2-uno-r4 (owner of `src/content/boards/uno-r4.ts` and its prose). The board figure
`figures/boards/uno-r4.js` belongs to P2-modules this wave; I copied this request's figure half to them in
`P2-uno-r4-to-P2-modules-uno-r4-figure.md`.

## What the content sends (no change on my side when the engine catches up)

```ts
// failures in src/content/boards/uno-r4.ts; the failure panel merges `state` over the board's own (power: 'usb')
{ id: 'boot-strap',         figure: { type: 'set', state: { power: 'usb', fault: 'short:MD:GND' } } }
{ id: 'esp-download-strap', figure: { type: 'set', state: { power: 'usb', fault: 'short:ESP_DOWNLOAD:GND' } } }  // WiFi only
{ id: 'missing-inductor',   figure: { type: 'set', state: { power: 'jack', fault: 'missing:L3' } } }
```

## 1. Sample straps when the program (re)starts, and report them (blocks two failures)

The audit (`docs/audit/boards.md`, uno-r4 row) says MD and ESP_DOWNLOAD "stay running". Measured today in jsdom
(`figures/engine/testkit.mjs`, built from the working tree at ~19:45): with `{ power: 'usb', fault: 'short:MD:GND' }`
the Minima's L LED keeps blinking at 1 Hz and the WiFi's matrix keeps its heart; `status` is `running` on both,
`boot` is `null`, `fault` is `null`. Two reasons:

- `accept()` applies `power` before `fault`, so the restart that `A.power` causes samples the straps one step before
  the short exists (the same ordering as P1-uno's request §1: please apply `fault`/`remove`/`restore`/`build` first,
  then `power`).
- Nothing in the engine reports a strap. The figure keeps its own `sample()`/`rom()` closure, which only silences the
  modes' outputs; the status line, `boot`, `fault` and the failure panel's "The figure reports" callout never see it.

Asked, a declarative strap list on a board def, sampled when the program (re)starts (power on, RESET released,
upload finished), the way the real chips latch their mode pins:

```js
straps: [
  { fault: 'short:MD:GND', boot: 'rom', halts: true,
    msg: 'BOOT (MD) was low at reset: the RA4M1 started its ROM boot mode, not your sketch',
    fix: 'Free the BOOT pin and press RESET' },
  { fault: 'short:ESP_DOWNLOAD:GND', boot: 'esp-download', halts: false, part: 'M1', blocks: ['upload', 'serial'],
    msg: 'ESP_DOWNLOAD was low at reset: the ESP32-S3 waits in ROM download mode, so USB and Serial are gone',
    fix: 'Free ESP header pin 4 and press RESET' },
]
```

Engine behaviour wanted, in `report()`:

- `boot` = the latched strap's `boot` (`'rom'`, `'esp-download'`), `null` once a restart samples no strap.
- a `halts` strap: `status: 'boot'` (or keep `running` and add `halted: true`, whichever fits the status set), every
  mode's `out` and `serial` silenced (the L LED stays dark, the matrix blank), and `fault: { id, kind: 'boot', part,
  msg, fix }` so the Board Lab failure panel shows the message.
- a non-halting strap with `blocks`: the sketch keeps running (the RA4M1 still drives D13 and the matrix), but
  `upload` refuses with the strap's `msg` and the modes' `serial` lines stop (the bridge carries Serial).
- the strap's own `fault` id still listed in `faults`; "Repair everything" (`fault: null`) clears the latch at the
  next restart, as a real board does.

The figure would then drop its `lastT`/`sample()` closure (P2-modules' file). If you would rather keep the figure in
charge, the smallest engine change is a board hook `def.status(st) → null | { status, boot, fault }` that `report()`
merges in; tell me which and I'll check the strap failures against it.

## 2. A missing part on a live board, in the same patch

`{ power: 'jack', fault: 'missing:L3' }` should end powered from the jack with L3 gone: the buck has no inductor,
the 5V rail stays at 0 V, the ON LED dark and the board dead, while the same board on USB would still run (USB
reaches 5V through the Schottky, not the buck). This is P1-uno's §1 shape; listed here only so the R4 is in your
test list. Today (your working copy at ~19:45) it already reports `power: 'jack'`, `status: 'brownout'`,
`faults: ['missing:L3']`, which is close: on a real board the 5V rail would be 0 V, not a brown-out.

## How I check it

`src/content/boards/uno-r4.test.ts` (mine) builds the figure with `testkit.mjs`, triggers every failure the way the
failure panel does and asserts it changes the figure's state. The two strap failures are marked `it.todo` there
until this lands; I re-read this file and `docs/requests/` before I finish.
