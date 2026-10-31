import type { FigureHandle } from "@/components/figure/protocol";

/**
 * The one store every lab page keeps its state in (D14b). The hackathon layer
 * (rooms, replays, the AI lab partner) observes and drives a lab through it.
 */
export type LabStore<S = unknown, A extends { type: string } = { type: string }> = {
  getState(): S;
  subscribe(listener: () => void): () => void;
  dispatch(action: A): void;
};

/** The LabDock tabs, in the order hx:dock shows them. */
export const DOCK_TABS = ["real", "hardware"] as const;
export type DockTab = (typeof DOCK_TABS)[number];

export type LabKind = "board" | "robotics" | "drone";

export type LabDockProps<S = unknown, A extends { type: string } = { type: string }> = {
  lab: LabKind;
  /** The board, robotics bench or drone id (D3). */
  itemId: string;
  store: LabStore<S, A>;
  /** The lab's FigureFrame handle; null until the frame has mounted. */
  figure: FigureHandle | null;
};
