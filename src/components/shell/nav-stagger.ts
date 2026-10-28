/** Delay in ms before link `index` starts arriving; mirrors the `stagger-in` rule in styles/motion.css. */
export function staggerDelay(index: number, stepMs = 60, capMs = 360): number {
  const position = Number.isFinite(index) ? Math.max(0, Math.round(index)) : 0;
  return Math.min(position * stepMs, capMs);
}
