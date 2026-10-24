# Colorfigures prompt: flying range

Build a Colorfigures-style flying range as one self-contained page: warm paper with grain, ink outlines with a
subtle hand-drawn wobble, flat light/mid/dark tones from the five palettes (tomato, mustard, mint, cobalt, blush)
plus technical monochrome, and flat blue cast shadows that fall to the lower left. Two views of the same field:

1. A chase view in isometric projection that follows the craft: the field slab with a metre grid, ground decals,
   boxes, houses with pyramid roofs, trees, power poles, barrels and race gates as real solids, checkpoint rings,
   the craft at its true pose with spinning props, its cast shadow, a dashed height line and a ground dot. Anything
   in front of the craft turns see-through and an x-ray outline of the craft is drawn on top, so it never vanishes
   inside a building. A pill marks the next gate or checkpoint (pinned to the edge with an arrow when off screen),
   and a wind arrow shows the wind. Drag to turn the view, scroll or pinch to zoom.
2. FPV goggles: a perspective view from the craft's camera (uptilted), sky, distant hills, the ground and field,
   every solid shaded by the sun, gate rings, prop blur at the top corners, and a Betaflight-style OSD: pack volts
   (red when low), amps and mAh, a flight timer, altitude, km/h, the mode or DISARMED / CRASHED, a crosshair, an
   artificial horizon whose bar moves up when the nose drops and turns with the bank, a blinking LOW BATTERY, and
   an arrow with the name and distance of the next target.

The page draws what the SimLab host sends (course, collision solids, craft look, one pose frame per animation
frame) over the SimLab figure bridge, forwards the flight keys back to the host, and flies a demo lap of the
5-inch gates when opened on its own. Source: figures/flight, built by `node figures/flight/build.mjs`.
