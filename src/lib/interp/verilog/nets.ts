// What a Verilog design shows on the board, as net levels: its ports spread bit by bit onto the board nets the
// lesson's port map names (the XDC/QSF mapping), and its 7-segment digits as one net per segment. The Board Lab's live
// run and the headless check run both read a design through this, so the figure and the checks see the same thing.
import type { BoardProfile } from '../profiles';

export const SEGMENTS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'DP'] as const;

/** The net for one segment of one digit, digit 0 rightmost: `DIG0_A` … `DIG5_DP`. */
export const digitNet = (digit: number, segment: number): string => `DIG${digit}_${SEGMENTS[segment]}`;

export interface FpgaNet {
  /** 0/1 for a steady level, the duty for a bit that switches faster than the eye (PWM, multiplexing). */
  v: number;
  pwm: boolean;
  input: boolean;
}

/** Duty between these is shown as dimmed brightness; outside them the bit is a plain level. */
const STEADY_LOW = 0.02;
const STEADY_HIGH = 0.98;
/** Brightness in twentieths, so a multiplexed digit's ripple doesn't flood the trace. */
const quantize = (x: number) => Math.round(x * 20) / 20;

export interface FpgaSnapshot {
  ports?: Record<string, number>;
  duty?: Record<string, number[]>;
  seg7?: number[][];
}

export function fpgaNets(profile: BoardProfile, snap: FpgaSnapshot, ports: Record<string, string[]> | undefined): Record<string, FpgaNet> {
  const out: Record<string, FpgaNet> = {};
  const inputs = new Set((profile.fpga?.ports ?? []).filter((p) => p.dir === 'in').map((p) => p.name));
  for (const [port, nets] of Object.entries(ports ?? {})) {
    const value = snap.ports?.[port];
    if (value === undefined) continue;
    const duty = snap.duty?.[port];
    nets.forEach((net, bit) => {
      const d = duty?.[bit];
      if (d === undefined) out[net] = { v: (value >>> bit) & 1, pwm: false, input: inputs.has(port) };
      else if (d > STEADY_LOW && d < STEADY_HIGH) out[net] = { v: quantize(d), pwm: true, input: false };
      else out[net] = { v: d >= 0.5 ? 1 : 0, pwm: false, input: false };
    });
  }
  snap.seg7?.forEach((digit, d) => digit.forEach((lit, k) => (out[digitNet(d, k)] = { v: quantize(lit), pwm: true, input: false })));
  return out;
}
