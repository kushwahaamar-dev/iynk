# P2-rob-sensors to driver: list the mat parts of four benches in `src/content/ids.ts`

Written 2026-10-25 by P2-rob-sensors. `src/content/ids.ts` has no wave-B owner, so this goes to the driver.

**What.** The four benches set out boards and parts on the mat beside the module (the bench figures' `periph`), but
their `ROBOTICS` entries list only the module. Each bench's content test checks `modules` and `parts` against
`ids.ts`, so the two must change together: the `ids.ts` lines below, and the matching `modules:` / `parts:` line in
each content file (mine; change them in the same commit, or tell me and I will).

| bench | `ids.ts` today | should be | content file line to match |
|---|---|---|---|
| `pca9685` | `modules: ['pca9685'], parts: ['servo-sg90']` | `modules: ['pca9685'], parts: ['servo-sg90', 'aa-holder-4']` | `src/content/robotics/pca9685.ts`: `parts: ['servo-sg90', 'aa-holder-4'],` |
| `mpu6050` | `modules: ['mpu6050'], parts: []` | `modules: ['mpu6050'], parts: ['piezo-buzzer']` | `src/content/robotics/mpu6050.ts`: `parts: ['piezo-buzzer'],` |
| `hc-sr04` | `modules: ['hc-sr04'], parts: []` | `modules: ['hc-sr04'], parts: ['piezo-buzzer']` | `src/content/robotics/hc-sr04.ts`: `parts: ['piezo-buzzer'],` |
| `qtr-8rc` | `modules: ['qtr-8rc'], parts: []` | `modules: ['qtr-8rc', 'tb6612fng'], parts: ['tt-motor', 'lipo-2s']` | `src/content/robotics/qtr-8rc.ts`: `modules: ['qtr-8rc', 'tb6612fng'],` and `parts: ['tt-motor', 'lipo-2s'],` |

Every id above is already in `MODULE_IDS` / `PART_IDS`. The Nano is the bench's `board: 'nano'` already. The
pca9685 arm is a bench-local drawing (`pca-arm`) made of three SG90s, so `servo-sg90` stays; the qtr-8rc test card
is drawn by the bench and needs no id.

**Why.** The lab pages build the "what you need" list and the part links from these arrays; today the MPU and
HC-SR04 benches show no buzzer, the arm no battery holder, and the line follower neither its motor driver nor its
motors and battery.

**Check.** `npx vitest run src/content/robotics/{pca9685,mpu6050,hc-sr04,qtr-8rc}.test.ts` ("matches its ids.ts
entry") and `npm run content:check`.
