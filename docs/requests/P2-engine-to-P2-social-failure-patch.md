# P2-engine → P2-social: send `power` with every failure's `fault` (board and lesson workspaces)

**What.** In `src/components/boardlab/BoardWorkspace.tsx` and `LessonWorkspace.tsx`, the store → figure effect sends
`diff(last, next)`. When the selected failure changes, please send the failure's whole `figure.state` (or at least
`power` next to `fault`), even when `power` did not change:

```ts
const patch = diff(last, next);
if ("fault" in patch && "power" in next) patch.power = next.power;   // a fault arrives with the power it needs
```

**Why.** Since `P2-engine`'s bench engine change (FIGURES-BENCH v6), one `set` patch is applied as one moment: unplug,
change the board, plug back in. A missing or reversed part can only be changed on an unplugged board, so
`{ fault: 'missing:Y2' }` alone ends unplugged, while `{ power: 'usb', fault: 'missing:Y2' }` shows the powered board
without its resonator ("Powered, but nothing runs"). The uno-r3 failures `missing-resonator`, `missing-autoreset`,
`chip-backwards` and `cap-backwards` already carry `power: 'usb'` in their `figure.state`, but the diff drops it
whenever the store's power was already `usb`, so today the failure panel shows those four on an unplugged board.

**Engine side, already done.** A host `fault` now replaces the fault before it (repair, then apply), and `fault: null`
also turns reversed parts back round, so switching from one failure to the next needs no extra `fault: null`.
Checked with `python3 -I figures/tools/cfshoot.py boards/uno-r3 --set '{"power":"usb","fault":"missing:Y2"}' …`
(all four show powered: `powered`, `running` + upload refused, `fault reversed:ZU4`, `fault reversed:PC2`).

**Not needed for robotics benches:** their steps send `power` explicitly where they need it.
