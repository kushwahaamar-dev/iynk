export interface BoardPinRow {
  header: string;
  pin: string;
  net?: string;
}

export interface BoardGroup {
  id: string;
  kind: "internal-short";
  pins: string[];
}

const LEG_NAMES: Record<string, string> = {
  "+": "PLUS",
  "-": "MINUS",
  "V+": "VPLUS",
  "+VS": "PLUS_VS",
  "T+": "RAIL_TP",
  "T-": "RAIL_TN",
  "B+": "RAIL_BP",
  "B-": "RAIL_BN",
};

const RAIL_HOLE = /^([TB])([+-])(\d{1,2})$/;

/** Runs of non-alphanumerics become one `_`, the ends are trimmed, a leading digit gets a `P` (rule C-PIN). */
export function cleanName(s: string): string {
  const name = s.replace(/[^A-Za-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  return /^[0-9]/.test(name) ? `P${name}` : name;
}

/** The pin id of a figure leg, rail or rail hole (rule C-LEG). The first matching row of the table wins. */
export function pinIdFromLeg(leg: string): string {
  const fixed = LEG_NAMES[leg];
  if (fixed !== undefined) return fixed;
  const hole = RAIL_HOLE.exec(leg);
  if (hole) return `RAIL_${hole[1]}${hole[2] === "+" ? "P" : "N"}${hole[3]}`;
  return cleanName(leg);
}

/**
 * Pin ids for a catalogue pinout, in row order (rule C-PIN). The first row of a net takes the net name; a later row of
 * the same net, and a row without a net, takes `<header>_<pin>`.
 */
export function boardPinIds(rows: readonly BoardPinRow[]): string[] {
  const named = new Set<string>();
  return rows.map((row) => {
    if (row.net !== undefined && !named.has(row.net)) {
      named.add(row.net);
      return cleanName(row.net);
    }
    return cleanName(`${row.header}_${row.pin}`);
  });
}

/** One `internal-short` group per net name that has two or more pins; `ids` is the output of `boardPinIds`. */
export function boardGroups(rows: readonly BoardPinRow[], ids: readonly string[]): BoardGroup[] {
  const byNet = new Map<string, string[]>();
  rows.forEach((row, i) => {
    if (row.net === undefined) return;
    const pins = byNet.get(row.net);
    if (pins) pins.push(ids[i]!);
    else byNet.set(row.net, [ids[i]!]);
  });
  const groups: BoardGroup[] = [];
  for (const pins of byNet.values()) {
    if (pins.length >= 2) groups.push({ id: `g_${pins[0]}`, kind: "internal-short", pins });
  }
  return groups;
}
