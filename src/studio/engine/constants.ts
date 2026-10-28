/*
 * Every value here is a HYPOTHESIS or a PROPOSAL from the Studio plan (STUDIO_EDITOR 5.4), kept in one file so the
 * frame-time harness curve (RS-01, T-B4-05) can replace them without touching the engine.
 *
 * LOD_SMALL_PX, LOD_LARGE_PX     HYPOTHESIS  on-screen part size where art swaps level
 * LOD_HYSTERESIS                 PROPOSAL    fraction a threshold must be crossed by before the level changes
 * ELEMENT_BUDGET                 PROPOSAL    art elements in view before level 2 falls back to level 1
 * GESTURE_SETTLE_MS              PROPOSAL    quiet time after a pan or zoom before the scene is rebuilt
 * ZOOM_MIN, ZOOM_MAX             HYPOTHESIS  CSS px per mm
 * PIN_SLOP_PX, TOUCH_TARGET_PX   PROPOSAL    pointer slop for pins, minimum touch target (UX_DESIGN_SYSTEM 12)
 * CULL_MARGIN_SCREENS            PROPOSAL    screens of overscan around the viewport when culling
 */
export const LOD_SMALL_PX = 35;
export const LOD_LARGE_PX = 120;
export const LOD_HYSTERESIS = 0.15;
export const ELEMENT_BUDGET = 10_000;
export const GESTURE_SETTLE_MS = 100;
export const ZOOM_MIN = 0.1;
export const ZOOM_MAX = 40;
export const PIN_SLOP_PX = 12;
export const TOUCH_TARGET_PX = 24;
export const CULL_MARGIN_SCREENS = 0.5;
export const PIN_RADIUS_MM = 0.5;
