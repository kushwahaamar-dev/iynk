import { LIMITS } from "../core/limits.ts";
import { fail, ok } from "../core/result.ts";
import type { Result } from "../core/result.ts";
import { sha256Hex } from "../core/sha256.ts";
import type { Project as ProjectState, Source } from "../project/generated/types.ts";
import { LOSS } from "./loss.ts";
import type { LossItem } from "./loss.ts";
import { utf8Decode } from "./zip.ts";

export { LOSS, lossCodes } from "./loss.ts";
export type { LossItem, LossSeverity } from "./loss.ts";

export interface InoFile {
  name: string;
  bytes: Uint8Array;
}

export interface InoDiagnostic {
  line: number;
  col: number;
  kind: "syntax" | "compile" | "unsupported";
  message: string;
  hint?: string;
}

export type InoAnalyser = (source: string, board: string) => InoDiagnostic[];

export const INO_IMPORT_ERROR_CODES = ["too-many-files", "too-big", "not-text", "no-entry", "bad-path", "empty"] as const;
export const INO_EXPORT_ERROR_CODES = ["no-arduino-board", "no-entry-source"] as const;

export interface InoImportError {
  code: (typeof INO_IMPORT_ERROR_CODES)[number];
  message: string;
  file?: string;
  limit?: number;
}

export interface InoExportError {
  code: (typeof INO_EXPORT_ERROR_CODES)[number];
  message: string;
}

export interface InoImport {
  board: string;
  title: string;
  sources: { path: string; text: string; role: "firmware" }[];
  entry: string;
  loss: LossItem[];
}

export interface InoExport {
  folder: string;
  files: { path: string; text: string }[];
  wiringCsv: string;
  loss: LossItem[];
}

const ENTRY_PATH = "main.ino";
const DEFAULT_BOARD = "uno-r3";
const SOURCE_EXTENSIONS = [".ino", ".h", ".hpp", ".c", ".cpp"];
const ARDUINO_LANGUAGES: ReadonlySet<string> = new Set(["arduino-cpp", "c", "cpp"]);
const HEADER_MARKER = "// iynk export";
const BANNER = "Written by iynk. The simulator approximates real hardware: check wiring and timing on the board before you power parts.";
const PARAM_PLACEHOLDER = /\{\{p:([^}]+)\}\}/g;

const BOARD_RULES: ReadonlyArray<{ board: string; pattern: RegExp; reason: string }> = [
  { board: "nodemcu", pattern: /#include\s*<ESP8266WiFi\.h>/, reason: "includes ESP8266WiFi.h" },
  { board: "uno-r4", pattern: /#include\s*<WiFiS3\.h>/, reason: "includes WiFiS3.h" },
  { board: "pico", pattern: /#include\s*<(?:pico\/[^>]*|hardware\/gpio\.h)>/, reason: "includes a Pico SDK header" },
  { board: "esp32-devkitc", pattern: /#include\s*<WiFi\.h>|#include\s*<WebServer\.h>|\besp_|ESP32/, reason: "uses an ESP32 library or name" },
];

const importError = (code: InoImportError["code"], message: string, extra: { file?: string; limit?: number } = {}) =>
  fail<InoImportError>({ code, message, ...extra });

const baseName = (name: string): string => name.split(/[\\/]/).pop() ?? name;
const extension = (name: string): string => {
  const dot = name.lastIndexOf(".");
  return dot < 0 ? "" : name.slice(dot).toLowerCase();
};

/** Picks the board a sketch was written for from its includes; the Uno R3 when nothing points elsewhere. */
export function guessBoard(texts: readonly string[]): { board: string; reasons: string[] } {
  const joined = texts.join("\n");
  const rule = BOARD_RULES.find((r) => r.pattern.test(joined));
  return rule ? { board: rule.board, reasons: [rule.reason] } : { board: DEFAULT_BOARD, reasons: [] };
}

function decodeFile(file: InoFile): Result<string, InoImportError> {
  if (file.bytes.length === 0) return importError("empty", `${file.name} is empty`, { file: file.name });
  if (file.bytes.includes(0)) return importError("not-text", `${file.name} is not a text file`, { file: file.name });
  const text = utf8Decode(file.bytes);
  if (text === null) return importError("not-text", `${file.name} is not valid UTF-8 text`, { file: file.name });
  return ok(text.startsWith("\uFEFF") ? text.slice(1) : text);
}

function pickEntry(inos: readonly { path: string; text: string }[], folder: string | undefined): string {
  if (inos.length === 1) return inos[0].path;
  const stem = (path: string) => path.slice(0, -".ino".length);
  const byFolder = folder === undefined ? undefined : inos.find((f) => stem(f.path) === folder);
  return (byFolder ?? inos.find((f) => /\bvoid\s+setup\s*\(/.test(f.text)) ?? inos[0]).path;
}

function analyserLoss(source: string, diagnostics: readonly InoDiagnostic[]): LossItem[] {
  const lines = source.split(/\r?\n/);
  return diagnostics.map((d) => {
    const header = /^\s*#\s*include\s*[<"]([^>"]+)[>"]/.exec(lines[d.line - 1] ?? "");
    const where = `${ENTRY_PATH}:${d.line}:${d.col}`;
    const message = d.hint ? `${d.message} (${d.hint})` : d.message;
    if (d.kind === "unsupported" && header) {
      return { code: LOSS.unsupportedInclude, severity: "warning", path: where, message: `${header[1]}: ${message}` };
    }
    return { code: LOSS.unsupported, severity: "warning", path: where, message };
  });
}

/**
 * Turns dropped `.ino`, `.h` and `.cpp` files into plain project data. Nothing runs: `analyse` only compiles the entry
 * file, and it reports the first blocking construct, so the loss list is never a full list.
 */
export function importIno(
  files: readonly InoFile[],
  analyse: InoAnalyser,
  choose: { board?: string } = {},
): Result<InoImport, InoImportError> {
  if (files.length === 0) return importError("empty", "No files were given");
  if (files.length > LIMITS.sources) {
    return importError("too-many-files", `${files.length} files; the limit is ${LIMITS.sources}`, { limit: LIMITS.sources });
  }

  const parts: { path: string; text: string }[] = [];
  const seen = new Set<string>();
  let folder: string | undefined;
  for (const file of files) {
    const segments = file.name.split(/[\\/]/).filter(Boolean);
    if (folder === undefined && segments.length > 1) folder = segments[segments.length - 2];
    const path = baseName(file.name).normalize("NFC");
    if (!SOURCE_EXTENSIONS.includes(extension(path)) || seen.has(path.toLowerCase())) {
      return importError("bad-path", `${file.name} cannot be imported as a sketch file`, { file: file.name });
    }
    seen.add(path.toLowerCase());
    const text = decodeFile(file);
    if (!text.ok) return fail(text.error);
    if (text.value.length > LIMITS.sourceBytes) {
      return importError("too-big", `${file.name} is over ${LIMITS.sourceBytes} characters`, { file: file.name, limit: LIMITS.sourceBytes });
    }
    parts.push({ path, text: text.value });
  }

  const inos = parts.filter((p) => extension(p.path) === ".ino");
  if (inos.length === 0) return importError("no-entry", "No .ino file among the files");
  const entryName = pickEntry(inos, folder);
  const entryText = parts.find((p) => p.path === entryName)!.text;
  const sources = parts.map((p) => ({ path: p.path === entryName ? ENTRY_PATH : p.path, text: p.text, role: "firmware" as const }));
  if (new Set(sources.map((s) => s.path.toLowerCase())).size !== sources.length) {
    return importError("bad-path", `${ENTRY_PATH} clashes with another file`, { file: ENTRY_PATH });
  }
  sources.sort((a, b) => (a.path === ENTRY_PATH ? -1 : b.path === ENTRY_PATH ? 1 : 0));

  const loss: LossItem[] = [];
  let board = choose.board;
  if (board === undefined) {
    const guess = guessBoard(parts.map((p) => p.text));
    board = guess.board;
    if (guess.reasons.length > 0) {
      loss.push({ code: LOSS.boardGuess, severity: "info", message: `Board set to ${board}: ${guess.reasons.join(", ")}` });
    }
  }
  if (inos.length > 1) {
    loss.push({ code: LOSS.merged, severity: "info", message: `${inos.length} .ino files; ${entryName} is the entry and the others are extra sources` });
  }
  loss.push(...analyserLoss(entryText, analyse(entryText, board)));

  const title = folder ?? entryName.slice(0, -".ino".length);
  return ok({ board, title, sources, entry: ENTRY_PATH, loss });
}

const csvCell = (value: string): string => (/[",\r\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value);
const byText = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

/** One row per connected pin of a component or board: `part,pin,net`, sorted by refdes then pin, CRLF line ends. */
export function wiringCsv(state: ProjectState): string {
  const refdes = new Map<string, string>([...state.boards, ...state.components].map((p) => [p.id, p.refdes]));
  const rows = new Map<string, [string, string, string]>();
  for (const net of state.nets) {
    for (const { c, p } of net.connections) {
      const part = refdes.get(c);
      if (part !== undefined) rows.set(`${c}\u0000${p}`, [part, p, net.name ?? net.id]);
    }
  }
  const sorted = [...rows.values()].sort((a, b) => byText(a[0], b[0]) || byText(a[1], b[1]));
  return ["part,pin,net", ...sorted.map((row) => row.map(csvCell).join(","))].join("\r\n") + "\r\n";
}

/** Fills `{{p:id}}` placeholders from the project parameters; an id with no parameter is left as written. */
function renderParams(text: string, values: ReadonlyMap<string, string>, unknown: Set<string>): string {
  return text.replace(PARAM_PLACEHOLDER, (whole, id: string) => {
    const value = values.get(id);
    if (value === undefined) unknown.add(id);
    return value ?? whole;
  });
}

const safeFolder = (title: string): string => {
  const name = title.replace(/[^A-Za-z0-9_]/g, "_").slice(0, 40);
  return name === "" || /^[0-9]/.test(name) ? `_${name}`.slice(0, 40) : name;
};

const oneLine = (text: string): string => text.replace(/[\r\n]+/g, " ");

/** The sketch folder for one Arduino-language board, with a header comment on the entry file and a wiring table. */
export function exportIno(
  state: ProjectState,
  boardId: string,
  opts: { exportedAt: string; appVersion: string },
): Result<InoExport, InoExportError> {
  const board = state.boards.find((b) => b.id === boardId);
  if (!board?.firmware || board.firmware.language !== "arduino-cpp") {
    return fail({ code: "no-arduino-board", message: `Board ${boardId} has no Arduino firmware` });
  }
  const { firmware } = board;
  const byId = new Map<string, Source>(state.sources.map((s) => [s.id, s]));
  const entry = byId.get(firmware.entry);
  if (!entry || !ARDUINO_LANGUAGES.has(entry.language)) {
    return fail({ code: "no-entry-source", message: `Board ${boardId} has no entry source` });
  }

  const loss: LossItem[] = [{ code: LOSS.banner, severity: "info", message: BANNER }];
  const values = new Map(state.parameters.map((p) => [p.id, String(p.value)]));
  const files: { path: string; text: string }[] = [];
  const folder = safeFolder(state.meta.title);
  for (const id of new Set([firmware.entry, ...firmware.sources])) {
    const source = byId.get(id);
    if (!source) continue;
    if (!ARDUINO_LANGUAGES.has(source.language)) {
      loss.push({ code: LOSS.otherLanguage, severity: "info", path: source.path, message: `${source.path} is not Arduino code and was left out` });
      continue;
    }
    const unknown = new Set<string>();
    const text = renderParams(source.content, values, unknown);
    if (unknown.size > 0) {
      loss.push({ code: LOSS.params, severity: "warning", path: source.path, message: `No parameter for ${[...unknown].join(", ")}; left as written` });
    }
    files.push({ path: `${folder}/${id === firmware.entry ? `${folder}.ino` : source.path}`, text });
  }

  const libraries = firmware.libraries ?? [];
  if (libraries.length > 0) {
    loss.push({ code: LOSS.libraries, severity: "info", message: `Install these in the Arduino IDE, no versions are pinned: ${libraries.join(", ")}` });
  }
  const csv = wiringCsv(state);
  if (csv.split("\r\n").length <= 2) {
    loss.push({ code: LOSS.noWiring, severity: "info", message: "No connected pins; the wiring table is empty" });
  }

  const header = [
    HEADER_MARKER,
    `// ${BANNER}`,
    `// Board: ${oneLine(board.definition.ref)}`,
    `// Libraries: ${libraries.length > 0 ? oneLine(libraries.join(", ")) : "none"}`,
    `// Exported: ${oneLine(opts.exportedAt)} by iynk ${oneLine(opts.appVersion)}`,
    `// Sources sha256: ${sha256Hex(files.map((f) => f.text).join("\n"))}`,
    "",
    "",
  ].join("\n");
  files[0] = { ...files[0], text: header + files[0].text };

  return ok({ folder, files, wiringCsv: csv, loss });
}

/** Removes the header `exportIno` wrote, only when the marker is the first line. */
export function stripInoHeader(text: string): string {
  if (!/^\/\/ iynk export\r?\n/.test(text)) return text;
  const end = text.indexOf("\n\n");
  return end < 0 ? text : text.slice(end + 2);
}
