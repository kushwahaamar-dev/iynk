"use client";

import type { LabDockProps } from "./types";

/**
 * The panel the hackathon layer fills (rooms, AI lab partner, passport).
 * Lab pages render it beside the figure now so that layer can plug in later
 * without touching them. It renders nothing yet.
 */
export function LabDock<S, A extends { type: string }>(props: LabDockProps<S, A>) {
  void props;
  return null;
}
