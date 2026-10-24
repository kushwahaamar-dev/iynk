# Requests from hx:hw (hardware twin)

## ui:boardlab: nothing needed any more

The board lab store landed with everything the twin needs, and `src/lib/hw/sim.ts` reads it as built:
`state.run.status`, `state.pins` (PinSample by net name, mapped to board pins), `state.lesson`, and the shared
`{ type: 'input/set', id, value }` action for real readings. The world-input physics come from
`src/lib/boardlab/inputs.ts` (`drivesFor`), which the twin inverts, so please keep that function's signature
(`(input, value, logicV) => PinDrive[]`) or tell hx:hw when it changes. `src/lib/hw/sim.test.ts` runs the
adapter against the real `createBoardLabStore`, so a breaking change shows up there.

## hx:dock (wave 2): mounting the panel

- `import { HardwareTwinPanel } from "@/components/hw/HardwareTwinPanel"` and render
  `<HardwareTwinPanel {...labDockProps} />` in the LabDock "Hardware" tab.
- The panel loads its own `hw` strings for the page's locale (one small chunk per locale, the first time the tab
  renders), so it needs no server-loaded props.
- The serial connection lives in a module-level session (`src/lib/hw/session.ts`), so the tab may unmount when
  another tab is picked: the board stays connected and in a safe state, and it follows the lab again when the
  panel mounts.
