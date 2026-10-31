import type { Fault, Source, Text } from "../generated/types.ts";
import { renderTemplate } from "./text.ts";
import type { Translate } from "./text.ts";
import type {
  ConvertFailureMode,
  ConvertRoboticsContent,
  ConvertStateCond,
  ConvertStatusField,
  ReportCode,
} from "./types.ts";

export type CauseOf = (failure: ConvertFailureMode) => { cause_id: string; symptom_ids: string[] };

/** What the bench keeps in `ext["x-iynk-bench"]`: the parts of the old content the project schema has no field for. */
export interface BenchExt {
  defaultMode: string;
  modes: {
    id: string;
    instant: boolean;
    bytes: number;
    serial: string[];
    title: Text;
    source: string;
    language: string;
    libraries: string[];
  }[];
  status: { id: string; key: string; format: ConvertStatusField["format"]; label: Text }[];
  current: {
    supplies: { id: string; volts: number; limitMa: number; label: Text }[];
    loads: { id: string; supply: string; ma: number; when: ConvertStateCond; perUnit?: { key: string; maPerUnit: number }; label: Text }[];
  };
  power: { source: string; label: Text; ok: Text };
  faultText: Record<string, { title: Text; symptom: Text; explanation: Text; fix: Text }>;
  concept: boolean;
  tasks: string[];
  unplaced: string[];
  figureParts: { id: string; short: string; role: string; name: Text; what: Text }[];
}

export interface BenchSimOptions {
  t: Translate;
  english: (key: string) => string;
  causeOf: CauseOf;
  /** The board instance the sources run on; undefined for a bench without a board. */
  board?: string;
  /** The project ids of the practice tasks. */
  tasks: string[];
  /** The figure parts that have no descriptor in the part library. */
  unplaced: string[];
  note: (code: ReportCode, message: string, refs?: string[]) => void;
}

const SOURCE_LANGUAGES: Readonly<Record<string, { language: Source["language"]; extension: string }>> = {
  "arduino-cpp": { language: "arduino-cpp", extension: "ino" },
  micropython: { language: "micropython", extension: "py" },
  python: { language: "python", extension: "py" },
  verilog: { language: "verilog", extension: "v" },
};

const CONCEPT_BENCH = "pi5-ros2";

export const slug = (s: string): string => s.toLowerCase().replace(/[^a-z0-9_-]+/g, "_").replace(/^[^a-z0-9]+/, "");

function faultOf(failure: ConvertFailureMode, causeOf: CauseOf, english: (key: string) => string): Fault {
  const { cause_id, symptom_ids } = causeOf(failure);
  return {
    id: `flt_${slug(failure.id).slice(0, 64)}`,
    cause_id,
    symptom_ids,
    kind: failure.kind as Fault["kind"],
    target: {},
    params: { legacy: true, trigger: failure.trigger, effect: failure.effect, figure: failure.figure },
    enabled: false,
    note: english(failure.title),
  };
}

function sourcesOf(c: ConvertRoboticsContent, { english, board, note }: BenchSimOptions): Source[] {
  const paths = new Set<string>();
  return c.modes.map((mode) => {
    const known = SOURCE_LANGUAGES[mode.language];
    if (!known) note("skipped", `the language "${mode.language}" of mode ${mode.id} is not a project language; the code is kept as text`, [mode.id]);
    const path = `${slug(mode.id)}.${known?.extension ?? "txt"}`;
    if (paths.has(path.toLowerCase())) throw new Error(`robotics/${c.id}: two modes write the file ${path}`);
    paths.add(path.toLowerCase());
    return {
      id: `src_${slug(c.id)}-${slug(mode.id)}`,
      path,
      language: known?.language ?? "text",
      role: "firmware",
      ...(board === undefined ? {} : { board }),
      content: renderTemplate(mode.code.source, [], {}, english),
    };
  });
}

/** The faults, the mode sources and the extension data of a bench. */
export function convertBenchSim(
  c: ConvertRoboticsContent,
  options: BenchSimOptions,
): { faults: Fault[]; sources: Source[]; ext: BenchExt } {
  const { t } = options;
  const sources = sourcesOf(c, options);
  const ext: BenchExt = {
    defaultMode: c.defaultMode,
    modes: c.modes.map((m, i) => ({
      id: m.id,
      instant: m.instant,
      bytes: m.bytes,
      serial: m.serial,
      title: t(m.title),
      source: sources[i]!.id,
      language: m.language,
      libraries: m.code.libraries,
    })),
    status: c.status.map((s) => ({ ...s, label: t(s.label) })),
    current: {
      supplies: c.current.supplies.map((s) => ({ ...s, label: t(s.label) })),
      loads: c.current.loads.map((l) => ({ ...l, label: t(l.label) })),
    },
    power: { source: c.power.source, label: t(c.power.label), ok: t(c.power.ok) },
    faultText: Object.fromEntries(
      c.faults.map((f) => [f.id, { title: t(f.title), symptom: t(f.symptom), explanation: t(f.explanation), fix: t(f.fix) }]),
    ),
    concept: c.id === CONCEPT_BENCH,
    tasks: options.tasks,
    unplaced: options.unplaced,
    figureParts: c.figure.parts.map((p) => ({ id: p.id, short: p.short, role: p.role, name: t(p.name), what: t(p.what) })),
  };
  return { faults: c.faults.map((f) => faultOf(f, options.causeOf, options.english)), sources, ext };
}
