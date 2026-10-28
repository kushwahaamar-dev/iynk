// JSON-lines logger. Callers pass metadata only (ids, counts, sizes, reasons):
// never chat text, names, actions or snapshots.

const LEVELS = { debug: 10, info: 20, warn: 30, error: 40, silent: 99 };

/** @typedef {keyof typeof LEVELS} LogLevel */
/** @typedef {Record<string, unknown>} LogFields */
/**
 * @typedef {{
 *   level: LogLevel,
 *   debug(event: string, fields?: LogFields): void,
 *   info(event: string, fields?: LogFields): void,
 *   warn(event: string, fields?: LogFields): void,
 *   error(event: string, fields?: LogFields): void,
 * }} Logger
 */

/** @param {unknown} level @returns {level is LogLevel} */
export function isLogLevel(level) {
  return typeof level === "string" && Object.hasOwn(LEVELS, level);
}

/**
 * @param {LogLevel} [level]
 * @param {(line: string) => void} [write]
 * @returns {Logger}
 */
export function createLogger(level = "info", write = (line) => process.stdout.write(`${line}\n`)) {
  const min = LEVELS[level];
  /** @param {Exclude<LogLevel, 'silent'>} name @param {string} event @param {LogFields} [fields] */
  const emit = (name, event, fields) => {
    if (LEVELS[name] < min) return;
    write(JSON.stringify({ ts: new Date().toISOString(), level: name, event, ...fields }));
  };
  return {
    level,
    debug: (event, fields) => emit("debug", event, fields),
    info: (event, fields) => emit("info", event, fields),
    warn: (event, fields) => emit("warn", event, fields),
    error: (event, fields) => emit("error", event, fields),
  };
}
