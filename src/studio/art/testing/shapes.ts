import type { FallbackSpec } from "../../../parts/fallback.ts";

export const TWO_LEAD: FallbackSpec = {
  renderer: "generic-two-lead",
  label: "R",
  showPinLabels: false,
  body_mm: { w: 7.62, h: 2.54 },
  pins: [
    { id: "1", x_mm: 0, y_mm: 0 },
    { id: "2", x_mm: 7.62, y_mm: 0 },
  ],
};

export const DIP: FallbackSpec = {
  renderer: "generic-dip",
  label: "IC",
  showPinLabels: true,
  body_mm: { w: 7.62, h: 10.16 },
  pins: [
    { id: "1", x_mm: 0, y_mm: 8.89, side: "left" },
    { id: "2", x_mm: 0, y_mm: 6.35, side: "left" },
    { id: "3", x_mm: 0, y_mm: 3.81, side: "left" },
    { id: "4", x_mm: 0, y_mm: 1.27, side: "left" },
    { id: "5", x_mm: 7.62, y_mm: 1.27, side: "right" },
    { id: "6", x_mm: 7.62, y_mm: 3.81, side: "right" },
    { id: "7", x_mm: 7.62, y_mm: 6.35, side: "right" },
    { id: "8", x_mm: 7.62, y_mm: 8.89, side: "right" },
  ],
};

export const HEADER_MODULE: FallbackSpec = {
  renderer: "generic-header-module",
  label: "Sensor",
  showPinLabels: false,
  body_mm: { w: 7.62, h: 10.16 },
  pins: [
    { id: "VCC", x_mm: 1.27, y_mm: 0, side: "bottom" },
    { id: "OUT", x_mm: 3.81, y_mm: 0, side: "bottom" },
    { id: "GND", x_mm: 6.35, y_mm: 0, side: "bottom" },
  ],
};

export const TERMINAL_MODULE: FallbackSpec = {
  renderer: "generic-terminal-module",
  label: "Driver",
  showPinLabels: false,
  body_mm: { w: 15.24, h: 10.16 },
  pins: [
    { id: "A", x_mm: 2.54, y_mm: 0, side: "bottom" },
    { id: "B", x_mm: 7.62, y_mm: 0, side: "bottom" },
    { id: "C", x_mm: 12.7, y_mm: 0, side: "bottom" },
  ],
};

export const BOX: FallbackSpec = {
  renderer: "generic-box",
  label: "Display",
  showPinLabels: true,
  body_mm: { w: 12.7, h: 12.7 },
  pins: [
    { id: "SDA", x_mm: 0, y_mm: 10.16, side: "left" },
    { id: "SCL", x_mm: 0, y_mm: 7.62, side: "left" },
    { id: "VCC", x_mm: 12.7, y_mm: 10.16, side: "right" },
    { id: "GND", x_mm: 12.7, y_mm: 7.62, side: "right" },
  ],
};

export const ALL_SHAPES: readonly FallbackSpec[] = [TWO_LEAD, DIP, HEADER_MODULE, TERMINAL_MODULE, BOX];
