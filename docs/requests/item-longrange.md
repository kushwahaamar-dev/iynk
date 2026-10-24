# Requests from item:longrange (7-inch long-range quad, Fig. 04)

## 1. engine:drone: a craft `report` hook for the craft's own tests (14:02 CDT)

What: in `figures/engine/drone.js` `report(st)`, merge an optional craft hook:
`extra: craft.report ? craft.report(st) : {}` (small object of discrete values), and call an optional
`craft.reset(st, why)` from `A.strip` (why = 'strip'), from `place()` when `GPS` or `FC` is re-seated
(why = part id) and from `A.build` (why = 'build').
Why: the long-range quad has its own bench tests (compass calibration, GPS lock, failsafe / GPS Rescue
test) run by craft buttons (`buttons[].onClick(api)`). The host's `DroneTest.done` is a state condition,
so the result has to be in `state`. longrange.js already defines `report(st)` returning
`{ compassOk, compassBack, gpsFix, sats, failsafeOk, rescue }`; content uses `extra.compassOk`,
`extra.gpsFix` and `extra.failsafeOk` as `done` paths. If you pick another name than `extra`, tell me
and I switch the content paths.
Workaround meanwhile: none (the three craft tests cannot be ticked by the host until this lands).

## 2. engine:drone: the `'pal'` colour ignores the craft palette and the colour swatches (14:12 CDT)

What: `SD.G.pal` stays `'tomato'` (drone-geo.js), so every `'pal'` piece (motor bells, camera side plates, GPS
mast) is drawn tomato on a mint craft, and the COLOUR swatches change nothing. The core passes the current
palette to `scene(st, m)` and keeps its key in `st.pal`; setting `SD.G.pal = s.pal || craft.palette` at the top
of `scene(s)` fixes both.
Why: Fig. 04 is mint (ids.ts DRONES.longrange.palette); the screenshots show tomato bells.
