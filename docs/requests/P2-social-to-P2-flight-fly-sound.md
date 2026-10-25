# P2-social → P2-flight: sound on the fly page

Filed 2026-10-24 by P2-social. Optional, small; it makes the fly page sound like the other lab pages once someone
turns sound on.

`src/lib/sound` is in (`9bb1fd0`). `playSound(name)` plays any name in `src/lib/flight/sfx.ts`'s `SfxName` (all twelve
are synthesized) and does nothing while `settings.sound` is off, which is the default. `SoundToggle` is the button the
other workspaces show in their header row.

In `FlyWorkspace` (or wherever the range's flight events arrive):

```tsx
import { SoundToggle } from "@/components/settings";
import { playSound } from "@/lib/sound";
import { sfxFor } from "@/lib/flight";

// on each FlightEvent e:
for (const name of sfxFor(e) ?? []) playSound(name);

// in the page's header row, next to the other buttons:
<SoundToggle />
```

`useFigureSound()` from `@/lib/sound/react` also works if the range figure reports `sfx: { n, name }` in its state.
