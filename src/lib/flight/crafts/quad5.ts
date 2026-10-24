import type { FlightCraft } from "../types";

// Fig. 01, the 5-inch freestyle quad on Betaflight. The angle limit, rates and
// camera tilt here are the same numbers its CLI snippet sets (one source of truth):
//   set angle_limit = 38
//   set rates_type = ACTUAL; roll/pitch rc_rate = 20 (200 deg/s centre), srate = 67 (670 deg/s max)
//   yaw rc_rate = 20, srate = 20 (200 deg/s)
//   camera uptilt 30 deg
export const quad5Craft: FlightCraft = {
  id: "quad5",
  class: "multirotor",
  drag: 0.045,
  ceiling: 12,
  hitRadius: 0.16, // 225 mm motor to motor plus 5-inch props: about 0.33 m across
  angleLimit: 38,
  acroRate: 670,
  yawRate: 200,
  levelRate: 9,
  climbRate: 2.2,
  spool: 18,
  camTilt: 30,
  fov: 105,
  fpvProps: true,
  look: {
    arms: 4,
    armLen: 0.1125,
    propR: 0.0635,
    body: [0.112, 0.046, 0.04],
    palette: "tomato",
    frame: "x",
    isoScale: 2,
  },
  modes: [
    { id: "alt", attitude: "angle", throttle: "climb", task: "free" },
    { id: "angle", attitude: "angle", throttle: "manual", task: "free" },
    { id: "acro", attitude: "acro", throttle: "manual", task: "free", expo: 0.7 },
    { id: "race", attitude: "angle", throttle: "manual", task: "race" },
    { id: "raceAcro", attitude: "acro", throttle: "manual", task: "race", expo: 0.7 },
    { id: "range", attitude: "angle", throttle: "climb", task: "range" },
  ],
};
