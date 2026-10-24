# Fact sheet: 3-inch cinewhoop on Betaflight (Drone Lab Fig. 03, `cinewhoop`)

Status: verified pass, 2026-10-24. Firmware facts are checked against the Betaflight 2026.6.2 source tree
(`src/main/cli/settings.c`, `io/serial.h`, `io/serial.c`, `pg/*.c`, the same tree the 5-inch sheet `quad5.md` used)
and betaflight.com docs. Hardware numbers come from DJI spec sheets and manufacturer / retailer listings. Anything
marked "(unverified)" was not confirmed against a primary source in the time box.

## 0. Header

**Craft class:** 3-inch (76 mm prop) ducted cinewhoop: a True-X quad whose props run inside protective ducts, flown
smoothly (Angle, Alt hold or soft-rate Acro) to film with an HD digital FPV camera (DJI O3 / O4 Pro) and often a
second, caseless ("naked") action camera. 4S LiPo (6S on heavier 3.5-inch builds), Betaflight.

**Real products / reference builds it represents:**

| Reference | What it is | Key figures | Link |
|---|---|---|---|
| GEPRC CineLog30 V3 (true 3") | 3" ducted cinewhoop, O4 Pro / BYO-VTX versions | 128 mm wheelbase, SPEEDX2 1404 3850KV, HQProp DT76mm x3 V2, TAKER F722 45A AIO (ICM-42688-P), 2.5 mm carbon plate, XT30, 4S 660-720 mAh LiHV, 187 +-2 g (TBS Nano RX version), "up to 8 min 10 s" at slow cruise [8][9] | https://www.getfpv.com/geprc-cinelog30-v3-wtfpv-drone-no-fpv-system.html |
| GEPRC CineLog35 V2 (3.5", named in the brief) | 3.5" ducted cinewhoop with DJI O3 | 142 mm wheelbase, SPEEDX2 2105.5 2150KV (6S) (some listings say 2650KV: conflict, see 9), GEP-F722-45A AIO V2, HQProp D-T90MM props, 285.8 g without battery, 6S 1050-1300 mAh, 5:00-8:30 min [10] | https://www.getfpv.com/geprc-cinelog-35-v2-3-5-hd-cinewhoop-drone-w-dji-o3-6s.html |
| iFlight ProTek35 V1.4 O3 6S (3.5", named in the brief) | 3.5" 6S cinewhoop with DJI O3 | 151 mm wheelbase, XING 2205 2300KV, Nazgul 3535 props, BLITZ Whoop F7 AIO 55A, 363 +-5 g dry, ~588 g with 6S 1400, ~6 min hover "no load", 217 x 194 x 32.5 mm [11] | https://shop.iflight.com (ProTek35 V1.4 page) |

Note: both references named in the brief are **3.5-inch** craft ("35" = 3.5"). The original's Fig. 03 (147 mm
wheelbase, 2004 motors, XT60, 4S 1100, ~440 g AUW with a naked GoPro) sits between the two classes: the frame
geometry and ducts are 3", the power system and mass are those of a heavy 3"/light 3.5" build. That is a real
build style (a 3" O3 whoop carrying a naked GoPro), so keep it, but do not label the figure "a CineLog35".

**What it is and what it is for.** A cinewhoop is a camera platform, not an acrobat. The ducts (rings round each
prop, usually a printed or moulded TPU/PC duct bolted to a thin carbon plate) let it fly close to people, through
houses, shops and venues and bump into walls without cutting anything. It flies slowly and smoothly, the pilot
watching an HD digital FPV feed; the footage is the HD camera's onboard recording (O3/O4: 4K with gyro data for
Gyroflow [19]) or a naked GoPro carried on top. Typical jobs: one-take real-estate and venue fly-throughs, event and
music-video shots, indoor product shots. Penalties: ducts add mass and drag, small props are less efficient, so
flight times are short (4-8 min) and top speed and wind tolerance are poor.

## 1. Sources

Firmware (Betaflight tag 2026.6.2; local copies made by the 5-inch sheet's research, re-grepped for this sheet):

1. Betaflight releases (2026.6.2 published 2026-09-16): https://github.com/betaflight/betaflight/releases
2. `src/main/cli/settings.c` (CLI names, ranges, lookup tables): https://github.com/betaflight/betaflight/blob/2026.6.2/src/main/cli/settings.c
3. `src/main/io/serial.h` (serial function bits) and `src/main/io/serial.c` (default DisplayPort port = `FUNCTION_VTX_MSP | FUNCTION_MSP`): https://github.com/betaflight/betaflight/blob/2026.6.2/src/main/io/serial.h
4. Defaults: `pg/rx.c` (`rc_smoothing_auto_factor_rpy = 30`), `flight/pid.c` (`feedforward_smooth_factor = 65`), `pg/rpm_filter.c`, `flight/failsafe.c`, `fc/controlrate_profile.c`, `fc/rc.c` (rate formulas), `fc/runtime_config.c` (arming-disable flags), `msp/msp_box.c` (aux mode IDs), `flight/mixer_init.c` (QuadX table): same tag.
5. Parameter-name lists per release (3.5.7 ... 2026.6.2), generated from `settings.c` of each tag: `displayport_msp_serial` exists in 4.2.11 and 4.3.2 and is gone from 4.4.3 onward.
6. Betaflight app OSD tab doc (Video Format `HD`, 53 x 20 default HD grid): https://betaflight.com/docs/wiki/app/osd-tab ; VTX hardware overview (DJI O3 MSP DisplayPort "partially implemented"): https://betaflight.com/docs/wiki/getting-started/hardware/vtx ; 4.5 release notes (`displayport_msp_fonts = 0,0,0,0` fix): https://betaflight.com/docs/wiki/release/Betaflight-4-5-Release-Notes ; DSHOT RPM Filtering, Reversed motor direction, Failsafe, Modes guides under https://betaflight.com/docs/wiki/guides/current/
7. Sibling sheet `docs/facts/quad5.md` sections 2.2, 5.x (Betaflight motor order, rates formulas, arming flags, OSD encoding), verified against the same 2026.6.2 tree.

Hardware spec sheets and listings:

8. GEPRC CineLog30 V3 listings (GetFPV, KiwiQuads, FPV24, Rotorvillage): https://kiwiquads.co.nz/product/geprc-cinelog30-v3-byo-vtx-expresslrs/ , https://www.fpv24.com/en/geprc/geprc-cinelog30-v3-dji-o4-pro-quadcopter-elrs-24g , https://rotorvillage.ca/geprc-cinelog30-v3-o4-pnp/
9. GetFPV CineLog30 V3 BYO: https://www.getfpv.com/geprc-cinelog30-v3-wtfpv-drone-no-fpv-system.html
10. GEPRC CineLog35 V2 listings: https://www.getfpv.com/geprc-cinelog-35-v2-3-5-hd-cinewhoop-drone-w-dji-o3-6s.html , https://kiwiquads.co.nz/product/geprc-cinelog-35-v2-3-5-hd-cinewhoop-w-dji-o3-gps , https://fpv24.com/en/geprc/geprc-cinelog-35-v2-dji-o3-drone-fpv-tbs-nano-rx
11. iFlight ProTek35 V1.4 O3 6S (iFlight shop + GetFPV): https://www.getfpv.com/iflight-protek35-v1-4-3-5-6s-cinewhoop-hd-w-dji-o3.html
12. DJI O3 Air Unit specifications (DJI text, via Clifton Cameras spec PDF): https://www.cliftoncameras.co.uk/uploads/specifications/DJI%20O3%20Air%20Unit.pdf ; DJI page https://www.dji.com/o3-air-unit/specs
13. DJI O4 Air Unit Pro specifications (DJI text, via Clifton Cameras spec PDF): https://cliftoncameras.co.uk/uploads/specifications/DJI%20O4%20Air%20Unit%20Pro%20Specifications.pdf ; https://www.dji.com/o4-air-unit/specs
14. DJI O4 Air Unit (Lite) listing (3.7-13.2 V input, 8.2 g with camera): https://rotorvillage.ca/dji-o4-air-unit-lite/
15. EMAX ECO II 2004 3000KV listings (16.4 g bare, 18 g with wires; 1170 g max thrust on 4S, prop not stated): https://www.rotorama.com/product/emax-eco-ii-2004-3000kv , https://www.racedayquads.com/products/emax-eco-ii-2004-3000kv-motor
16. iFlight XING 1404 4600KV (10.1 g with wire, 16.8 V max) and XING2 1404 (8.5 g, 11.8 A / 174.6 W max continuous): https://www.getfpv.com/iflight-xing2-1404-3000kv-3800kv-4600kv-toothpick-motor.html
17. ExpressLRS "Configuring the FC": https://www.expresslrs.org/quick-start/receivers/configuring-fc/
18. Ducted-fan literature (static thrust gain depends on tip gap and rpm; few % to tens of %): e.g. https://yadda.icm.edu.pl/baztech/element/bwmeta1.element.baztech-cf5d0ab3-db28-4e67-912a-2d289c00fe10/c/Muszynski.pdf
19. Gyroflow (stabilisation from gyro logs): https://gyroflow.xyz/
20. Drone Lab research doc `docs/research/drone-lab-a.md` sections 3.2, 9.3 and Appendix A (what the original shows).
21. Betaflight 2026.6.2 `src/main/fc/rc.c` (`applyActualRates`, `applyBetaflightRates`) `src/main/fc/rc.h` (`RC_SMOOTHING_AUTO_FACTOR_MIN 0`, `_MAX 250`) and `src/main/fc/rc_adjustments.h` (`ADJUSTMENT_RATE_PROFILE` = 12): https://github.com/betaflight/betaflight/blob/2026.6.2/src/main/fc/rc.c
22. Naked GoPro: Oscar Liang, GoPro Hero 10 Bones review (54 g claimed, 59.9 g measured): https://oscarliang.com/gopro-10-bones/ ; GEPRC naked Hero 11 case with BEC: https://rotorvillage.ca/geprc-naked-gopro-hero-11-case-with-bec-board/ ; GEPRC naked Hero 10: https://pyrodrone.com/collections/all/products/geprc-naked-gopro-hero-10-camera ; SpeedyBee BEC (3-6S, 5 V 3 A, Labs firmware note): https://www.onedrone.com/store/power-cable-bec-type-c-for-gopro-6-to-11-2pcs-by-speedybee.html
23. Oscar Liang, Capacitors for noise filtering: https://oscarliang.com/capacitors-mini-quad ; 680 uF 35 V cap marketed for 6S: https://www.myfpvstore.com/extras-and-hardware/680uf-35v-low-esr-capacitor/
24. Smoke stoppers: IntoFPV threads https://intofpv.com/archive/index.php/thread-8059.html ; commercial units https://www.myfpvstore.com/extras-and-hardware/dual-xt60-xt30-smoke-stopper-2-in-1/ , https://www.fpvfaster.com.au/products/iflight-smart-smoke-stopper-xt60-xt30

## 2. Geometry (craft frame)

Frame axes: x forward (nose / camera), y left, z up; origin at the frame centre on top of the bottom plate; mm.

### 2.1 Frame

| Item | Original (Fig. 03) | Real 3" reference (CineLog30 V3) | Notes |
|---|---|---|---|
| Layout | True-X, ducts on a one-piece bottom plate | True-X, ducted | |
| Wheelbase (motor-to-motor diagonal) | 147.1 mm (motors at +-52, +-52) [20] | 128 mm [8] | 3.5" craft: 142 mm (CineLog35 V2), 151 mm (ProTek35) [10][11]. 147 mm is plausible for a 3" whoop with room for 2004 motors; use the original's 147 mm. |
| Motor-to-motor (side, adjacent) | 104 mm | ~90.5 mm (128 / sqrt 2) | |
| Arm length (centre to motor axis) | 73.5 mm | 64 mm | "arms" are short spokes of the bottom plate; ducts carry the loads |
| Bottom plate | 3 mm carbon, drawn 90 x 48 mm body with spokes to 82 mm [20] | 2.5 mm carbon [8] | 2.5-3 mm is typical |
| Ducts | inner radius 39.5 mm, outer 41.5 mm, z -6 to +18 mm (24 mm tall) [20] | moulded/printed ducts with bumpers | gap between adjacent ducts 104 - 83 = 21 mm |
| Prop-to-duct radial clearance | text says ~1.5 mm; with a real 3" prop (r 38.1 mm) and r 39.5 duct it is **1.4 mm** | 1-2 mm typical (unverified) | the drawn prop r 37 gives 2.5 mm; draw r 38 for realism |
| Top plate | 110 x 56 mm on 28 mm standoffs [20] | | carries battery + action cam |
| Stack mount | 20 x 20 mm, M2 (FC + 4-in-1 ESC) [20] | 25.5 x 25.5 mm whoop AIO is also common on 3" (unverified for CineLog30 V3) | |
| HD camera mount | O3 camera between two side plates, 20 deg uptilt [20] | | O3 camera module 21.2 x 20 x 19.5 mm [12] |
| Frame mass | 62 g plate set + 52 g ducts/bumpers + 12 g top plate/standoffs = 126 g [20] | not published | plausible; real injection-moulded ducts 30-50 g a set (unverified) |

### 2.2 Motors: Betaflight QUAD X order and spin

Betaflight QuadX mixer (output order) [4][7]: M1 rear right, M2 front right, M3 rear left, M4 front left.

| Motor | Corner | x (mm) | y (mm) | Spin seen from above, **props in (default, `yaw_motors_reversed = OFF`)** | **Props out (`yaw_motors_reversed = ON`)** |
|---|---|---|---|---|---|
| M1 | rear right | -52 | -52 | **CW** | CCW |
| M2 | front right | +52 | -52 | **CCW** | CW |
| M3 | rear left | -52 | +52 | **CCW** | CW |
| M4 | front left | +52 | +52 | **CW** | CCW |

- Diagonal pairs (M1+M4, M2+M3) spin the same way so yaw torques cancel.
- Many cinewhoop pilots and BNFs run **props out** (front edges move outward), which is said to throw less debris at the camera
  and help yaw authority (unverified for ducted craft); both are valid, the ESC spin and `yaw_motors_reversed` must simply agree (unverified which
  direction the CineLog/ProTek BNFs ship with).
- `yaw_motors_reversed` only changes the mixer's yaw sign; actual spin is set in the ESC or by swapping two motor
  wires [6: Reversed motor direction].

### 2.3 Props, camera, battery, mass

| Item | Value |
|---|---|
| Props | 3" (76 mm) ducted props, 3-blade (e.g. HQProp DT76mm x3 V2 [8]) or 5-blade "quiet" (e.g. Gemfan D76, unverified). The original's options: 3x3x3, 3x2x5, 3x3.5x3 (diameter x pitch x blades, inches). Ducted props have wide, square-ish tips. |
| Prop mass | 2-3 g each (original 2.6-3.1 g, plausible, unverified per product) |
| Prop axis height | motor on the bottom plate, prop plane roughly mid-duct (z ~ +8 to +12 mm, estimate, unverified), inside a duct z -6..+18 (original drawing [20]) |
| HD FPV camera | DJI O3 camera at the nose (position x ~ +50 mm, z ~ +15 mm is an estimate, unverified), **20 deg uptilt** in the original [20]; real cinewhoops run 0-20 deg (slow flight needs little tilt) |
| Action camera | naked GoPro on a TPU wedge on the top plate, front, original tilt 14 deg [20] |
| Battery | on the top plate behind the action cam, centred over the thrust centre (original), strapped; 4S 1100: 66 x 34 x 28 mm |
| Mass budget (original default) | 441 g AUW: fixed parts 227 g + motors 76 g + props 10.4 g + battery 128 g [20] |

## 3. The original's catalogue, sanity-checked

The calculator stays identical (`cineCalc`: `thrust = 0.24 * pf * sz * krpm^2`, `hoverW = auw / (3.4 * eff)`,
`flyMin = hoverMin * 0.85`, `maxA = 4 * thrust / (1.7 * eff) / V`, `over = cells > maxCells`, `weak = tw < 3`) [20].
Only flag what the descriptions get wrong.

### 3.1 Batteries

| Option | Original | Real-world check | Verdict |
|---|---|---|---|
| `4S 1100 mAh` | 128 g, $26, 66 x 34 x 28 mm | 4S 1100 packs weigh ~120-135 g (unverified per brand); $20-35 | plausible |
| `4S 850 mAh` | 98 g, $22, 56 x 30 x 24 | 4S 850: ~95-105 g (unverified) | plausible |
| `6S 850 mAh` | 140 g, $34, 66 x 34 x 30 | 6S 850: ~135-150 g (unverified) | plausible |

Real 3" cinewhoops use 4S 650-850 mAh LiHV on XT30 (CineLog30 V3: 4S 660-720 [8]); 3.5" ones use 6S 1050-1400
on XT60 [10][11]. A 4S 1100 on a 3" is heavy but realistic for a GoPro-carrying build.

### 3.2 Motors

| Option | Original | Real-world check | Verdict |
|---|---|---|---|
| `2004 3000KV` (maxCells 4) | 19 g, $21 | EMAX ECO II 2004 3000KV: 16.4 g bare, 18 g with wires [15]; ~$18-22 | mass fine. EMAX lists it for 4S and also for "3-inch on 6S"; the sim calls 6S "over" (a desync risk): on 6S a 3000KV turns 66.6 krpm no load into a 3" prop, which is too fast for a heavy ducted craft; the warning is sensible |
| `2004 1950KV` (maxCells 6) | 19 g, $22 | no common 2004 1950KV; EMAX ECO II 2004 comes in 1600/2000/2400/3000KV, all 12N14P [15]. Real 6S 3"-3.5" cine motors: 2004-2005 at 1700-2150KV (e.g. CineLog35 V2 2105.5 2150KV [10]) | label is fine as "~1950-2000KV 6S class" |
| `1404 4600KV` (maxCells 4) | 10 g, $16 | iFlight XING 1404 4600KV: 10.1 g with wire, 2-4S, **9N12P** (one reseller, Probots; GetFPV lists the XING 1404 at 8.5 g without cable) [16]; XING2 1404: 8.5 g bare, 11.8 A / 174.6 W max continuous [16] (current/power unverified) | mass and 4S limit correct. A 1404 is 9N12P, so it needs `motor_poles = 12`, not 14 (see 5.3). Real 3" cinewhoops do use 1404 (CineLog30 V3: 1404 3850KV [8]) but on ~190 g dry / ~270 g AUW craft (AUW estimated with a 4S 700 pack); on the original's 405 g build with a naked GoPro a 1404 is marginal (sim T:W 3.5) |

Sim thrust per motor at full throttle (`0.24 * sz * krpm^2`, 3x3x3 prop): 2004-3000 on 4S **473 g**; 2004-1950 on
6S **450 g**; 2004-1950 on 4S **200 g** (T:W 1.8, flagged weak); 1404-4600 on 4S **356 g**; 2004-3000 on 6S 1064 g
(flagged over). Real thrust of a 2004 3000KV on 4S with a 3" ducted tri-blade: no manufacturer table found;
EMAX gives 1170 g max on 4S with an unstated (probably 4-5") prop [15]. With a 3" prop the real figure is lower,
around 500-800 g per motor (unverified estimate); the sim's 473 g is conservative but the same order.

### 3.3 Props

| Option | Original | Check | Verdict |
|---|---|---|---|
| `3x3x3 ducted tri-blade` | pf 1.00, eff 1.00, 2.6 g, $4 | HQProp DT76mm x3 class; ~2-3 g (unverified) | plausible |
| `3x2x5 five-blade (quiet)` | pf .92, eff .94, 3.1 g, $5 | 5-blade 3" ducted props exist (Gemfan D76-5, unverified). "Quiet" is relative: more blades at lower pitch give a lower-pitch, less harsh tone; it is not quiet | the "(quiet)" tag overstates it; acceptable |
| `3x3.5x3 (punchy)` | pf 1.08, eff .92, 2.8 g, $4 | higher pitch = more thrust and current, less efficient at hover: direction correct | plausible |

Price is per set of 4 (the sim charges `price * 2`, i.e. 2 pairs); real 3" ducted props cost $3-5 per set of 4
(unverified).

### 3.4 Fixed parts

| Part | Original | Real-world check | Verdict |
|---|---|---|---|
| `3" carbon frame + plates` | 62 g, $55 | plausible (unverified) | ok |
| `Printed ducts + bumpers` | 52 g, $0 | printed TPU/PC ducts 30-60 g a set (unverified). $0 assumes you print them | ok; say "printed yourself" |
| `35A 4-in-1 ESC (20x20)` | 7 g, $40 | 20x20 4-in-1 ESCs 35-45 A weigh ~5-8 g (unverified); real cinewhoops often use an AIO (FC + ESC on one board) [8][10][11] | ok |
| `F7 flight controller (20x20)` | 6 g, $40 | plausible | ok |
| `O3-style digital air unit + camera` | 36 g, $229 | DJI O3: **36.4 g with camera, 28 g without, antenna ~3 g** [12]; launch price US$229 (unverified) | correct mass; real installed mass ~39.4 g with antenna |
| `ELRS 2.4 GHz receiver` | 2 g, $18 | ELRS nano receivers ~1-2 g with antenna (unverified) | ok |
| `XT60 pigtail + low-ESR cap` | 10 g, $4 | plausible. Wiring shows **470 uF 35 V**: Oscar Liang says 25 V "should be enough for most cases" with 35 V for extra safety against spikes; community and vendor guidance is 25 V for 4S and 35 V for 6S (25.2 V full) [23]. The 5-inch sheet uses 1000 uF | ok on 4S and 6S |
| `Top plate + standoffs` | 12 g, $6 | plausible | ok |
| `Battery strap + pad` | 4 g, $3 | plausible | ok |
| `Naked action cam + TPU mount` | 36 g, $199 | GoPro Bones (factory naked Hero 10): 54 g claimed, 59.9 g measured [22]; GEPRC naked Hero 10/11 in its case: 46.7 g; GEPRC "naked camera kit": 29.6 g (configuration unclear) [22]. Stock Hero 11 Black: 154 g with battery; Hero 11 Mini: 131-133 g. $199 is low: a naked conversion is a GoPro body plus a case/BEC kit (unverified prices) | 36 g is at the light end (a stripped board in a minimal case); a realistic range is 30-60 g. Price optimistic |

### 3.5 Calculator outputs vs reality (default 4s1100 / 2004-3000 / 3x3x3)

| Output | Sim | Real-world | Comment |
|---|---|---|---|
| AUW | 441 g | 3" O3 whoop + naked GoPro + 4S 1100: ~400-470 g (estimate). CineLog30 V3 + 4S 700: ~270 g. ProTek35 + 6S 1400: ~588 g [11] | plausible |
| T:W | 4.3:1 | cinewhoops: 3-5:1 (unverified typical) | plausible |
| Hover throttle | 48 % | 35-50 % on loaded whoops (unverified) | plausible |
| Max current | 75 A | 4 x 15-25 A peaks on 4S (unverified) | plausible |
| Hover time | 6.0 min | CineLog30 V3 "up to 8:10" slow cruise [8]; ProTek35 "~6 min hover, no load" [11]; CineLog35 V2 5:00-8:30 [10] | plausible |
| "Freestyle time" | 5.1 min | the label is wrong for a cinewhoop (it is a "cine" time = 0.85 x hover); keep the number, relabel "Cruise time" | label slip |
| Hover efficiency | 3.4 g/W assumed | ProTek35: 588 g, 6S 1400, ~6 min => about 2.4 g/W (inferred) | the sim is optimistic; keep |

## 4. Electronics and wiring

### 4.1 Flight controller and ESC

- FC: F7 (STM32F722) or F4 (F405), ICM-42688-P / BMI270 gyro, 20 x 20 or 25.5 x 25.5 mm mount with rubber grommets
  (soft-mounted). CineLog30 V3: TAKER F722 45A AIO, ICM-42688-P [8]; CineLog35 V2: GEP-F722-45A AIO V2 [10];
  ProTek35 V1.4: BLITZ Whoop F7 AIO 55A [11].
- ESC: 35-55 A 4-in-1 (or AIO), 2-6S. Firmware: **BLHeli_32 is end-of-life** (its developer ceased operations in early June 2024 and the
  update servers went down; Oscar Liang's article is dated 3 June 2024, Hackaday reported it 7 June 2024; an exact
  "30 June" end date is unverified, https://oscarliang.com/end-of-blheli_32 ); new ESCs ship **AM32** or **Bluejay** (BLHeli_S hardware). Protocol **DShot300 or DShot600, bidirectional**
  (needed for the RPM filter). Configured in https://esc-configurator.com (Bluejay/AM32) [7].
- Motor wires: 3 per motor to the ESC pads, any order (swap two to reverse spin).

### 4.2 Receiver, video, GPS

- Receiver: **ExpressLRS 2.4 GHz**, CRSF protocol (420 kbaud, set automatically), on a full UART: ELRS TX -> FC RX pad, ELRS RX ->
  FC TX pad, 5 V, GND. Betaflight: Serial RX on that UART, `serialrx_provider = CRSF` [17]. Original: UART2 [20].
- HD video, DJI spec sheets [12][13]:

  | | DJI O3 Air Unit | DJI O4 Air Unit Pro | DJI O4 Air Unit (Lite) [14] |
  |---|---|---|---|
  | Mass | 36.4 g with camera, 28 g without; antenna ~3 g | 32 g with camera, 15.6 g without; antenna 2.1 g each | 8.2 g with camera (9.2 g with lens mount) |
  | Size | transmission module 32.5 x 30.5 x 14.5 mm; camera 21.2 x 20 x 19.5 mm; coax 115 mm; 3-in-1 cable 100 mm | module 33.5 x 33.5 x 13 mm; camera 25.55 x 20 x 23.3 mm; coax 140 mm | |
  | Input | 7.4-26.4 V | 7.4-26.4 V | **3.7-13.2 V** |
  | Camera | 1/1.7" sensor, 155 deg FOV, f/2.8, 4K/60 (16:9) onboard recording (retailer listings, unverified on DJI's page) | 1/1.3" sensor, 155 deg FOV, f/2.8, 4K up to 120 fps, max 130 Mbps, D-Log M, RockSteady or Gyroflow | 1/2" sensor, 4K/60 |
  | Live view | 1080p/100 fps, latency as low as 30 ms (Goggles 2); 810p/120 fps < 28 ms (FPV Goggles V2) | 1080p/100 fps < 30 ms (Goggles 2/Integra) | 1080p/100 fps |
  | Range | 10 km FCC, 2 km CE | 15 km FCC, 8 km CE (with Goggles 3 / N3) | 10 km FCC, 6 km CE (with Goggles 3 / N3) |

  The air unit's 3-in-1
  (6-pin, pin count unverified; DJI lists it as a 100 mm "3-in-1 Cable" [12][13]) cable carries battery voltage, GND, UART TX/RX (MSP DisplayPort: OSD text and telemetry) and an SBUS
  line (DJI controller only). Wiring: air-unit TX -> FC RX, air-unit RX -> FC TX on a free UART (original:
  UART1). **DJI O4 Air Unit (Lite) is 3.7-13.2 V only (1S-3S) [14]: on a 4S or 6S cinewhoop it needs a 9-12 V
  BEC.** Pin colours of the DJI 3-in-1 cable vary by batch (unverified); label by function, not colour.
- OSD: no analog OSD chip; Betaflight sends the OSD as MSP DisplayPort commands and the goggles draw it.
- Action cam: a naked GoPro has no battery. It is powered from the flight pack through a small BEC board (e.g.
  SpeedyBee BEC: 3-6S in, 5 V / 3 A out; GEPRC: 2S-6S in, 5 V / 2.5 A out) [22]; Hero 10/11 need GoPro Labs
  firmware to record without a battery [22]. It has no data link to the FC. The original's label "no wires:
  records on its own" is true only for a camera with its own battery (a full GoPro, Insta360 Go); for a naked
  GoPro draw a power lead from the XT60 / BEC.
- GPS / compass: not normally fitted to a cinewhoop (indoor use). The 3.5" CineLog35 V2 is sold with an optional
  GEP-M8U GPS [10]. If fitted: GPS on a UART (function bit 2), compass on I2C.

### 4.3 Power

- Battery lead: XT60 on 4S 1100 / 6S builds; **XT30** on true 3" builds with 650-850 mAh packs [8].
- Low-ESR electrolytic across the ESC battery pads, legs cut short: original **470 uF 35 V** (25 V suffices on 4S,
  35 V is the usual choice on 6S [23]). It absorbs the voltage spikes from motor braking (DShot active braking) and
  smooths noise for the gyro and the video link.
- BECs on the FC: 5 V (receiver, GPS, buzzer, LED, naked GoPro), 9-10 V (VTX/camera, on many AIOs), 3.3 V (gyro).
  DJI O3/O4 Pro take battery voltage directly.
- LEDs/buzzer: optional 5 V buzzer on BZ+/BZ- pads; DShot beacon can beep the motors instead.

### 4.4 Typical pad / UART map (named FC: original's F7 20x20 stack; generic, unverified for any one board)

| Function | FC pad | Betaflight port | Serial function bits |
|---|---|---|---|
| DJI O3 / O4 Pro (MSP DisplayPort) | TX1 / RX1, VBAT, GND | `UART1` (legacy id 0) | MSP 1 + VTX_MSP 131072 = **131073** |
| ExpressLRS receiver | TX2 / RX2, 5V, GND | `UART2` (legacy id 1) | RX_SERIAL **64** |
| Motors | M1-M4 (8-pin harness to the 4-in-1) | | |
| Battery sense / current | VBAT and CURR on the ESC harness | | |

Wire colours: power red, ground black; signal colours are manufacturer-dependent (unverified as a standard).

## 5. Firmware: Betaflight

### 5.1 Version

- Current stable on 2026-10-24: **Betaflight 2026.6.2** (released 2026-09-16) [1]. Calendar versions since 2025.12;
  there is no "4.6" [7].
- The DJI setup below is for 4.4 and later (in 4.2-4.3 the port was chosen with `displayport_msp_serial` [5]); DJI O3 MSP DisplayPort is described as "partially implemented" by
  Betaflight's own hardware page [6].

### 5.2 Renamed or removed parameters relevant to this craft

| Old / wrong name | Current (2026.6.2) | Notes |
|---|---|---|
| `displayport_msp_serial` (4.2-4.3) | removed in 4.4; set the **VTX_MSP** function bit (131072) on the air unit's port instead [5][3] | the Ports tab shows it as peripheral "VTX (MSP + Displayport)" (label unverified in 2026.6) |
| `p_level` / `angle_level_strength` | **`angle_p_gain`** (0-200, default 50) [7] | |
| `osd_timer_1` | never existed; **`osd_tim1`** (packed) + **`osd_tim_1_pos`** [2] | |
| `osd_stat_max_spd` | never existed; **`osd_stat_bitmask`** (bit 3 = max speed, needs GPS) [2][7] | |
| `dshot_idle_value` | **`motor_idle`** (2025.12+) [7] | |
| `d_min_roll` + `d_roll` | **`d_roll`** (base D) + **`d_max_roll`** (2025.12+) [7] | |

### 5.3 Initial setup (CLI)

```
# Betaflight 2026.6.2, F7 20x20 stack, DJI O3 on UART1, ExpressLRS on UART2
mixer QUADX
set align_board_yaw = 0                    # FC arrow to the nose; 180 if it points back
set motor_pwm_protocol = DSHOT300          # DSHOT600 also fine on F7
set dshot_bidir = ON                       # RPM telemetry for the RPM filter
set motor_poles = 14                       # 2004 (12N14P) = 14; a 1404 (XING/SPEEDX2 1404 are 9N12P) needs 12 (count bell magnets)
serial UART1 131073 115200 57600 0 115200  # MSP (1) + VTX_MSP (131072): DJI MSP DisplayPort
set osd_displayport_device = MSP           # NONE, AUTO, MAX7456, MSP, FRSKYOSD, FBOSD
set vcd_video_system = HD                  # AUTO, PAL, NTSC, HD
serial UART2 64 115200 57600 0 115200      # RX_SERIAL: ExpressLRS
set serialrx_provider = CRSF
set yaw_motors_reversed = OFF              # ON if the props are mounted props-out
save
```

Checks [2][3][7]: `serial <port> <functionMask> <mspBaud> <gpsBaud> <telemetryBaud> <blackboxBaud>`; the parser
also accepts the legacy numeric id (0 = UART1). `osd_displayport_device` and `vcd_video_system` lookup tables are
as commented. Betaflight's own default for a board-defined DisplayPort UART is `FUNCTION_VTX_MSP | FUNCTION_MSP`
(`io/serial.c`) [3]. If OSD glyphs are missing on DJI: `set displayport_msp_fonts = 0,0,0,0` [6]. HD OSD grid
defaults to 53 x 20 and is resized when the VTX reports its canvas [6]; the goggles' custom/canvas OSD option must be enabled
(menu name varies by goggles firmware, unverified).

### 5.4 RPM filter

```
set dshot_bidir = ON
set motor_poles = 14               # 14 for the 2004 (12N14P); 12 for a 9N12P 1404. Default 14, range 4-255
set rpm_filter_harmonics = 3       # 0-3, default 3 (0 disables)
set rpm_filter_min_hz = 100        # 30-200, default 100
set rpm_filter_q = 500             # 250-3000, default 500
set rpm_filter_fade_range_hz = 50  # 0-1000, default 50
set rpm_filter_lpf_hz = 150        # 100-500, default 150
save
```
Ranges from `settings.c` [2], defaults from `pg/rpm_filter.c` [4][7]. Needs bidirectional DShot ESC firmware
(Bluejay, AM32, BLHeli_32 32.7+). If an ESC does not report RPM, arming is blocked with `DSHOT_TELEM` [7].
Why a cinewhoop needs it: small, high-rpm motors put noise into the gyro that shows as "jello" (rolling-shutter
wobble) in the footage; the RPM filter notches it at each motor's frequency and harmonics.

### 5.5 Modes and cine-style rates

`aux <slot> <permanentModeId> <auxChannel 0=AUX1> <start> <end> <logic> <linkedTo>`; IDs: ARM 0, ANGLE 1,
HORIZON 2, ALTHOLD 3, BEEPER 13, AIR MODE 28, FLIP OVER AFTER CRASH 35, PREARM 36 [4][7]. There is no ACRO mode:
Acro is "ANGLE/HORIZON/ALTHOLD off".

```
aux 0 0 0 1700 2100 0 0     # ARM on AUX1 high
aux 1 1 1 1300 2100 0 0     # ANGLE on AUX2 mid+high (low = acro)
aux 2 3 2 1700 2100 0 0     # ALTHOLD on AUX3 high (2025.12+, needs a barometer)
aux 3 35 3 1700 2100 0 0    # turtle mode on AUX4 high
```

**Cine rates.** Betaflight's default `rates_type` is `ACTUAL` (defaults rc_rate 7, srate 67 on all axes,
`fc/controlrate_profile.c`) [4]. `applyActualRates()` in `fc/rc.c` [21]: `centerSensitivity = rc_rate * 10`,
`stickMovement = max(0, srate * 10 - centerSensitivity)`, `rate = stick * centerSensitivity + stickMovement *
expoCurve(stick)`, so at full stick the rate is `max(rc_rate, srate) * 10` deg/s. Under BETAFLIGHT rates
(`applyBetaflightRates()`), full stick = `200 * rc_rate/100 / (1 - srate/100)` deg/s [21][7].

```
# cine (ACTUAL rates): ~150 deg/s roll/pitch, ~100 deg/s yaw at full stick
set rates_type = ACTUAL
set roll_rc_rate = 7
set pitch_rc_rate = 7
set roll_srate = 15
set pitch_srate = 15
set yaw_rc_rate = 7
set yaw_srate = 10
set roll_expo = 0
set rc_smoothing_auto_factor = 60      # 0-250, default 30; higher = smoother, more delay
set feedforward_smooth_factor = 75     # 0-95, default 65
set angle_limit = 30                   # 10-80 deg, default 60
set angle_p_gain = 50                  # was p_level
save
```
All names exist in 2026.6.2 [2]; defaults `rc_smoothing_auto_factor_rpy = 30` [4], `feedforward_smooth_factor = 65`
[4]; `RC_SMOOTHING_AUTO_FACTOR_MIN 0`, `_MAX 250` (`fc/rc.h`) [21]. `rc_smoothing_auto_factor_throttle`
(default 30) smooths the throttle channel the same way, useful for smooth climbs [2][4]. `throttle_limit_type` / `throttle_limit_percent` (25-100) can cap throttle for indoor work [2].

**"Cine mode" is not a Betaflight flight mode.** It is a set of rates (a rate profile). Real pilots keep a soft
cine rate profile next to a normal one and pick it with a switch:

```
rateprofile 1                          # 0-based index: Configurator "Rateprofile 2"
set rates_type = ACTUAL
set roll_rc_rate = 7
set pitch_rc_rate = 7
set roll_srate = 15
set pitch_srate = 15
set yaw_rc_rate = 7
set yaw_srate = 10
rateprofile 0
adjrange 0 0 2 900 2100 12 2 0 0       # AUX3 position selects the rate profile (function 12 = RATE_PROFILE)
save
```
`rateprofile` takes a 0-based index (`changeControlRateProfile(i)` in `cli.c`) [2]; `adjrange <index> 0 <range
channel> <start> <end> <function> <select channel> [<center> <scale>]` (`cli.c`), and `ADJUSTMENT_RATE_PROFILE` is
12 in the `fc/rc_adjustments.h` enum (NONE = 0) [21]. That a 3-position switch on the select channel maps to
profiles 1/2/3 is from the Adjustments tab behaviour (unverified in source here).

Mapping the original's modes to real Betaflight:

| Original mode | Real Betaflight equivalent |
|---|---|
| `alt` Altitude hold (easy) | ANGLE (ID 1) + ALTHOLD (ID 3) aux ranges; 2025.12+ only, needs a barometer (most cine AIOs have one: unverified per board); `alt_hold_deadband` 0-70 % of stick, default 20 [2][7] |
| `cine` Cine (smooth) | ANGLE or acro with the cine rate profile above, high `rc_smoothing_auto_factor`, `feedforward_smooth_factor` |
| `angle` Angle mode | ANGLE (ID 1); `angle_limit` 10-80 deg (30 for cine), `angle_p_gain` |
| `acro` Acro (rate) | no mode active; soft rates (e.g. ACTUAL 7 / 40 = 400 deg/s max) |
| `race` Gate fly-through | not a mode: OSD timer (`osd_tim1`, `osd_tim_1_pos`) |
| `range` Real-estate fly-through | not a mode: cine rate profile; record 4K, ND filter for a ~1/120 s shutter at 60 fps (180-degree rule) |

### 5.6 OSD (HD)

- Element positions: `(x & 31) | (y << 5)`, plus bit 10 (1024) for x >= 32 (x bit 5 moves to bit 10, `OSD_POS()` in
  `osd/osd.h`), plus profile bit 2048 (profile 1); HD grid 53 x 20 (`OSD_HD_COLS`/`OSD_HD_ROWS`) [6][7]. Example
  column 40 row 18: (40 & 31) | 1024 | (18 << 5) | 2048 = 8 + 1024 + 576 + 2048 = 3656. Example timer at column 23 row 1:
  `set osd_tim_1_pos = 2103`; timer source/precision in `osd_tim1` (`18` = last armed, hundredths) [7].
- Useful elements: `osd_vbat_pos`, `osd_avg_cell_voltage_pos`, `osd_mah_drawn_pos`, `osd_link_quality_pos`,
  `osd_flymode_pos`, `osd_warnings_pos`, `osd_tim_1_pos` [2].

### 5.7 VTX power

DJI O3/O4 power and channel are set in the goggles menu; the Betaflight VTX tab and `vtxtable` "can be ignored"
for DJI [6]. Pit/low power: DJI goggles settings (unverified names).

### 5.8 Failsafe

`failsafe_procedure` = `DROP` (default) / `AUTO-LAND` / `GPS-RESCUE`; `failsafe_delay` 15 (1.5 s) [7]. Indoors near
people a cinewhoop normally uses `DROP` (the ducts make a drop survivable); GPS Rescue is not an option without GPS.

### 5.9 Board alignment, motor reversal, accelerometer

- `align_board_roll/pitch/yaw` (-180..360) [7].
- Motor spin: ESC Configurator / Motors tab DShot direction, or swap two wires; then match `yaw_motors_reversed`.
- Accelerometer calibration on a level surface, Setup tab "Calibrate Accelerometer" or sticks throttle high + yaw
  left + pitch down [7]; uncalibrated acc with ANGLE/ALTHOLD configured blocks arming with `NO_ACC_CAL` [7].

### 5.10 Arming-disable flags (2026.6.2) [4][7]

`NOGYRO, FAILSAFE, RXLOSS, NOT_DISARMED, BOXFAILSAFE, RUNAWAY, CRASH, THROTTLE, ANGLE, BOOTGRACE, NOPREARM, LOAD,
CALIB, CLI, CMS, BST, MSP, PARALYZE, GPS, RESCUE_SW, DSHOT_TELEM, REBOOT_REQD, DSHOT_BBANG, NO_ACC_CAL, MOTOR_PROTO,
FLIP_SWITCH, ALT_HOLD_SW, POS_HOLD_SW, AUTOPILOT_SW, ARM_SWITCH`. `ANGLE` = tilted more than `small_angle`
(default 25 deg).

### 5.11 Errors in the original's CLI and the corrected form

| Original | Problem | Correct (2026.6.2) |
|---|---|---|
| `serial 0 1 115200 57600 0 115200 # UART1 = MSP DisplayPort` | mask 1 is plain MSP; since 4.4 the DisplayPort port needs the VTX_MSP bit | `serial UART1 131073 115200 57600 0 115200` |
| (missing) | HD video format not set | `set vcd_video_system = HD` |
| `serial 1 64 ...` | accepted (legacy id), but no provider set | add `set serialrx_provider = CRSF` |
| `set roll_rc_rate = 50` + `set roll_srate = 30` "~150 deg/s" | under default ACTUAL rates this is 500 deg/s linear; only under `rates_type = BETAFLIGHT` is it ~143 deg/s; pitch is not set at all | ACTUAL: `roll/pitch_rc_rate = 7`, `roll/pitch_srate = 15` |
| `set yaw_rc_rate = 40` | ACTUAL: 400 deg/s centre, not slow | `yaw_rc_rate = 7`, `yaw_srate = 10` |
| acro `roll_rc_rate = 80`, `roll_srate = 50` "soft" | ACTUAL: 800 deg/s linear, not soft; BETAFLIGHT rates: 320 deg/s | soft acro ACTUAL: `rc_rate 7`, `srate 40` (400 deg/s) |
| `set p_level = 50` | removed after 3.5 | `set angle_p_gain = 50` |
| `set osd_timer_1 = ON` | no such setting | `set osd_tim_1_pos = 2103` (and `osd_tim1`) |
| `set osd_stat_max_spd = ON` | no such setting | OR bit 3 (value 8) into `osd_stat_bitmask`; needs GPS |
| `aux 1 ANGLE ...`, `aux 2 ALTHOLD ...` | `aux` takes numeric IDs | `aux 1 1 1 1300 2100 0 0`, `aux 2 3 2 1700 2100 0 0` |
| `set d_roll = 45` | valid; since 2025.12 base D, peak in `d_max_roll` | keep, optionally `d_max_roll` |
| sim 38 deg / 540 deg/s in angle/acro vs code 30 deg | mismatch [20] | make the sim follow the CLI |

## 6. Safety tests

| Test | How | What it catches |
|---|---|---|
| Smoke stopper | a current limiter plugged between battery and XT60/XT30 for the first power-up. Home-made: an incandescent bulb in series; on a short the filament heats, its resistance rises and the bulb lights, limiting current. Commercial: a self-resetting fuse or electronic limiter with an LED/beeper that cuts power on overcurrent [24]. Do not spin motors above idle through it: normal motor current trips it [24] | solder bridges, VBAT-GND shorts, a reversed or shorted cap, a motor wire touching the carbon. It does not catch everything: a part can still fail before it trips [24] |
| Props-off motor test | Betaflight Configurator Motors tab, battery in, props off, "I understand the risks", spin each motor slider; or ESC Configurator / DShot direction commands | wrong motor order (wrong corner spins), wrong spin direction, desync, a dead ESC channel |
| Accelerometer calibration | level surface, Setup tab or stick command (throttle high, yaw left, pitch down) | drift in Angle/Alt hold, `NO_ACC_CAL` |
| Compass calibration | only if a GPS/compass is fitted (rare): stick command throttle high + yaw right + pitch down, rotate on all axes [7] | heading errors |
| Pre-arm checks | Setup tab arming-disable flags, `status` in CLI | RXLOSS, THROTTLE, ANGLE, DSHOT_TELEM, NO_ACC_CAL |
| Prop/duct clearance | spin each prop by hand inside the duct; check for rub, cracks | duct strike, chipped blades (vibration, jello) |
| OSD / link check | props off, goggles on, disarmed: OSD elements visible, link quality shown, arming flags on the OSD | missing VTX_MSP bit, `osd_displayport_device` not MSP, TX/RX swapped, wrong UART |
| Failsafe test | props off, armed, switch the radio off: motors must stop (DROP) within `failsafe_delay` | receiver not set to send no pulses, wrong failsafe procedure |

## 7. Flight characteristics

| Item | Typical value |
|---|---|
| AUW | 3" O4/O3 whoop: 250-300 g with 4S 650-850 (CineLog30 V3 187 g dry) [8]; with naked GoPro + 4S 1100: ~400-450 g (estimate); 3.5" 6S: ~480-590 g [10][11] |
| T:W | 3-5:1 (unverified) |
| Hover throttle | 35-50 % (unverified) |
| Flight time | 5-8 min cine cruise [8][10][11]; 3-4 min hard (unverified) |
| Top speed | ducts add drag: 60-100 km/h on 3" (unverified); ProTek35 listing claims 140 km/h (marketing) [11] |
| Current draw | hover ~8-12 A (4S, ~440 g, estimate), peaks 60-80 A |
| Motor-out | a quad cannot hold attitude with one motor out; it spins and falls (the ducts protect people, not the craft) |
| Ducts | protect props and people; small static-thrust gain at low speed when the tip gap is tight (literature: a few % to tens of %, strongly gap- and rpm-dependent [18]); add drag and mass in forward flight and catch wind |
| Prop wash | descending through its own wash makes ducted whoops wobble; cine pilots descend slowly or while moving forward |

## 8. Real failure modes

| Failure | Cause | What the pilot sees |
|---|---|---|
| Desync | too much KV/cells for the prop, ESC timing, cheap ESC firmware | one motor stutters, quad twitches or drops from the sky; a beep from the motors |
| Brown-out | voltage sag on a small pack, weak BEC, VTX on the same rail | OSD flickers, video drops, FC reboots mid-air (falls) |
| Reversed motor or swapped props | spin direction wrong for the corner, or props on the wrong motors | flips or spins violently the instant it takes off |
| Wrong board alignment | FC arrow not to the nose and `align_board_yaw` wrong | uncontrollable tilt in the wrong direction on take-off |
| Missing capacitor | voltage spikes from the ESC | noisy/broken HD video, gyro noise, dead ESC or FC |
| Jello | no RPM filter, bent props, prop rubbing the duct, loose camera | wobble in the footage |
| Duct strike | prop out of round or duct warped | loud buzz, sudden yaw, chipped blades |
| OSD missing on DJI | VTX_MSP bit not set, `osd_displayport_device` not MSP, TX/RX swapped | goggles show video but no OSD |
| Video drop indoors | walls between pilot and quad | video freezes; ELRS link stays (why the separate receiver) |
| GPS/compass | not normally fitted | n/a |

## 9. Uncertainties

- CineLog35 V2 motor KV: most listings 2105.5 2150KV, two say 2650KV [10]; 2150KV is the more common figure.
- ProTek35 V1.4: dry 363 g vs a reseller 348.3 g (older variant with 45A AIO) [11].
- Battery and prop masses in section 3 are typical values, not checked per brand.
- Real 3" thrust table for a 2004 3000KV with a ducted tri-blade: not found; 500-800 g is an estimate.
- Naked GoPro mass: sources range from 29.6 g (GEPRC kit, unclear what it includes) to 46.7 g (GEPRC case) and
  54-59.9 g (GoPro Bones) [22]; the original's 36 g is at the light end. Prices not verified.
- DJI 3-in-1 cable pin colours: not found in any primary source; label by function.
- O3 camera sensor (1/1.7"), 4K/60 and the 50 Mbps transmission bitrate come from retailer listings, not the DJI
  spec PDF text extracted here; DJI's marketing page has also claimed 4K/120 (conflict). The mass, size, voltage,
  latency and range figures are from the DJI spec text [12].
- O3 launch price US$229: from memory, not re-checked.
- Ports tab label "VTX (MSP + Displayport)" (seen in community guides and a Configurator source mirror, not
  checked in the 2026.6 app) and the DJI goggles custom-OSD menu name.
- Props-in vs props-out on the reference BNFs; camera and prop-plane z positions in 2.3 are estimates.
- Hover throttle, T:W, top speed and current figures in section 7 are typical estimates, not measurements.
- 3-position switch to rate profile 1/2/3 mapping in `adjrange` (behaviour, not read in source).
- Motor pole count per motor: 2004 = 12N14P (several retailer listings), 1404 = 9N12P (XING 1404 and SPEEDX2 1404
  retailer listings); no manufacturer datasheet opened.
- BLHeli_32 exact end date (early June 2024 is sourced; "30 June 2024" is not).

## Verification

Adversarial fact-check, 2026-10-24 14:10-14:25 CDT. Betaflight claims were re-checked against raw source files fetched
fresh from tag 2026.6.2 (`https://raw.githubusercontent.com/betaflight/betaflight/2026.6.2/src/main/...`, abbreviated
`BF:` below); DJI figures against the DJI spec text re-downloaded from Clifton Cameras.

| # | Claim | Status | Source | Old -> new (corrections) |
|---|---|---|---|---|
| 1 | QuadX order M1 rear-right, M2 front-right, M3 rear-left, M4 front-left; props-in M1 CW, M2 CCW, M3 CCW, M4 CW | confirmed | BF: `flight/mixer_init.c` (`mixerQuadX` yaw column -1/+1/+1/-1; the Y4 table in the same file labels yaw -1 = CW, +1 = CCW) | |
| 2 | Serial function bits MSP 1, GPS 2, RX_SERIAL 64, VTX_MSP 131072; default DisplayPort port = `FUNCTION_VTX_MSP \| FUNCTION_MSP` | confirmed | BF: `io/serial.h` lines 37-53, `io/serial.c` line 364 | |
| 3 | `serial UART1 131073 115200 57600 0 115200` syntax; port names and legacy id 0 = UART1 both accepted; baud order msp/gps/telemetry/blackbox | confirmed | BF: `cli/cli.c` `cliSerial()` (`findSerialPortByName`, legacy-id correction, case 0-3) | |
| 4 | `motor_poles = 14` "12N14P on 1404/2004" | corrected | https://www.rotorama.com/product/geprc-speedx2-1404-3850kv , https://pyrodrone.com/collections/14xx/products/geprc-speedx2-1404-3850kv-motor-1-pc , https://probots.co.in/iflight-xing-1404-4600kv-black-fpv-drone-motor.html , https://www.rotorama.com/product/emax-eco-ii-2004-3000kv ; BF: `pg/motor.c` default 14 | 1404 = 12N14P / 14 poles -> 1404 is 9N12P, `motor_poles = 12`; 2004 stays 12N14P / 14 |
| 5 | `osd_displayport_device` table NONE, AUTO, MAX7456, MSP, FRSKYOSD, FBOSD; `vcd_video_system` AUTO, PAL, NTSC, HD | confirmed | BF: `cli/settings.c` lines 414-416, 518-520 | |
| 6 | RPM filter defaults 3 / 100 / 500 / 50 / 150 and ranges 0-3, 30-200, 250-3000, 0-1000, 100-500 | confirmed | BF: `pg/rpm_filter.c`, `cli/settings.c` lines 1970-1975 | |
| 7 | Aux permanent IDs ARM 0, ANGLE 1, HORIZON 2, ALTHOLD 3, BEEPER 13, AIR MODE 28, FLIP OVER AFTER CRASH 35, PREARM 36 | confirmed | BF: `msp/msp_box.c` lines 49-85 | |
| 8 | ACTUAL is default `rates_type`, rc_rate 7, srate 67, expo 0; full stick = max(rc_rate, srate) x 10 deg/s; BETAFLIGHT full stick = 200 x rc_rate/100 / (1 - srate/100) | confirmed | BF: `fc/controlrate_profile.c` lines 48-57, `fc/rc.c` `applyActualRates()` / `applyBetaflightRates()` | |
| 9 | Original-CLI rate maths: 50/30 = 500 deg/s ACTUAL, ~143 BETAFLIGHT; 80/50 = 800 ACTUAL, 320 BETAFLIGHT; cine 7/15 = 150, yaw 7/10 = 100 | confirmed | recomputed from #8 | |
| 10 | `rc_smoothing_auto_factor` 0-250 default 30 (also `_throttle` 30); `feedforward_smooth_factor` 0-95 default 65 | confirmed | BF: `fc/rc.h` lines 28-29, `pg/rx.c` 111-112, `cli/settings.c` 851-852 and 1328, `flight/pid.c` line 200 | |
| 11 | `angle_limit` 10-80 default 60; `angle_p_gain` 0-200 default 50; `small_angle` default 25 | confirmed | BF: `cli/settings.c` 1274, 1277, 1112; `flight/pid.c` 132, 142; `flight/imu.c` 121-123 (25 unless `USE_RACE_PRO`, then 180) | |
| 12 | `rateprofile` 0-based; `adjrange` arg order; `ADJUSTMENT_RATE_PROFILE` = 12 | confirmed | BF: `cli/cli.c` `cliRateProfile`, `cliAdjustmentRange`; `fc/rc_adjustments.h` enum | |
| 13 | `failsafe_procedure` AUTO-LAND / DROP / GPS-RESCUE, default DROP; `failsafe_delay` default 15 (1.5 s) | confirmed | BF: `cli/settings.c` lines 336-338, `flight/failsafe.c` lines 84-87 | |
| 14 | Arming-disable flag list (30 names, NOGYRO ... ARM_SWITCH) | confirmed | BF: `fc/runtime_config.c` `armingDisableFlagNames[]` | |
| 15 | OSD position `x \| (y << 5)` + 2048, HD 53 x 20; `osd_tim_1_pos = 2103`; `osd_tim1` 18 = last armed, hundredths; `osd_stat_bitmask` bit 3 = max speed | corrected (incomplete) | BF: `osd/osd.h` lines 67-105, 253-256, 295-312 | formula missing the x >= 32 extension bit -> `(x & 31) \| (y << 5) \| (x >= 32 ? 1024 : 0)` + 2048; 2103 and 18 are correct |
| 16 | Removed/renamed params: `displayport_msp_serial` in 4.3.2 not 4.4.3; `dshot_idle_value`, `p_level`, `d_min_roll` absent in 2026.6.2; `motor_idle`, `d_max_roll`, `alt_hold_deadband` (0-70, default 20), `throttle_limit_percent` (25-100) present | confirmed | BF 4.3.2 / 4.4.3 / 2026.6.2 `cli/settings.c`; `fc/parameter_names.h`; `pg/alt_hold_multirotor.c` line 38; v3.5.7 `interface/settings.c` has `p_level` | |
| 17 | Acc calibration stick command throttle high + yaw left + pitch down; compass throttle high + yaw right + pitch down | confirmed | BF: `fc/rc_controls.c` lines 304, 312 | |
| 18 | CRSF 420 kbaud, set automatically; `serialrx_provider = CRSF` | confirmed | BF: `rx/crsf_protocol.h` line 36 (420000 unless `USE_CRSF_OFFICIAL_SPEC`), `rx/crsf.c`; https://www.expresslrs.org/quick-start/receivers/configuring-fc/ | |
| 19 | DJI O3: 36.4 g with camera, 28 g without, antenna 3 g; module 32.5 x 30.5 x 14.5; camera 21.2 x 20 x 19.5; coax 115 mm; 3-in-1 100 mm; 7.4-26.4 V; latency and range figures | confirmed | https://www.cliftoncameras.co.uk/uploads/specifications/DJI%20O3%20Air%20Unit.pdf | (camera sensor / 4K60 still unverified: not in the DJI spec text) |
| 20 | DJI O4 Pro: 32 g / 15.6 g, antenna 2.1 g each, 33.5 x 33.5 x 13, camera 25.55 x 20 x 23.3, coax 140, 7.4-26.4 V, 1/1.3", 155 deg, f/2.8, 4K up to 120 fps, 130 Mbps, D-Log M, RockSteady/Gyroflow | confirmed | https://cliftoncameras.co.uk/uploads/specifications/DJI%20O4%20Air%20Unit%20Pro%20Specifications.pdf | range was blank -> 15 km FCC, 8 km CE |
| 21 | DJI O4 Air Unit (Lite): 8.2 g with camera (9.2 g with lens mount), 3.7-13.2 V, 1/2" sensor, 4K/60, 1080p/100 live view | confirmed | https://www.cliftoncameras.co.uk/uploads/specifications/DJI%20O4%20Air%20Unit%20Specifications.pdf | range "10 km FCC" -> 10 km FCC, 6 km CE |
| 22 | CineLog30 V3: 128 mm, 2.5 mm plate, TAKER F722 45A AIO (STM32F722RET6, ICM-42688-P), SPEEDX2 1404 3850KV, HQProp DT76mm x3 V2, XT30, 4S 660-720 LiHV, 187 +-2 g (TBS Nano RX), 8:10 slow cruise | confirmed | https://kiwiquads.co.nz/product/geprc-cinelog30-v3-byo-vtx-expresslrs/ , https://rotorvillage.ca/geprc-cinelog30-v3-o4-pnp/ | |
| 23 | EMAX ECO II 2004 3000KV 16.4 g bare / 18 g with wires, 1170 g max on 4S; "comes in 1600/2000/3000KV" | corrected | https://www.rotorama.com/product/emax-eco-ii-2004-3000kv , https://www.rotorama.com/product/emax-emax-eco-ii-2004-2400kv , https://tuah.wrekd.com/products/emax-eco-ii-2004-3000kv-motor | KV list 1600/2000/3000 -> 1600/2000/2400/3000 (12N14P); masses confirmed; 1170 g is a single-retailer figure |
| 24 | iFlight XING 1404 4600KV 10.1 g with wire | unverified | https://probots.co.in/iflight-xing-1404-4600kv-black-fpv-drone-motor.html (single reseller), GetFPV lists 8.5 g without cable | marked as single-reseller value; added 9N12P |
| 25 | BLHeli_32 "support ended 30 June 2024" | corrected | https://oscarliang.com/end-of-blheli_32 (dated 3 June 2024), https://hackaday.com/2024/06/07/ | 30 June 2024 -> ceased operations early June 2024 (exact date unverified) |
| 26 | Betaflight 2026.6.2 current stable (2026-09-16); calendar versions since 2025.12 | confirmed | https://api.github.com/repos/betaflight/betaflight/releases | |
| 27 | Original calculator outputs: thrust 473 / 450 / 200 / 356 / 1064 g; AUW 441 g (227 + 76 + 10.4 + 128); geometry 52 mm offsets -> 147.1 mm diagonal, 104 mm side | confirmed | recomputed from `docs/research/drone-lab-a.md` sections 3.2 and Appendix A | |
| 28 | DJI 3-in-1 cable is "6-pin" | unverified | not in DJI spec text | marked "(pin count unverified)" |
