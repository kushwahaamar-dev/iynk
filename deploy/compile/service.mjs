import { spawn, execFile } from "node:child_process";
import { createServer } from "node:http";
import { randomBytes } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { promisify } from "node:util";

const PORT = Number(process.env.IYNK_COMPILE_PORT ?? 8788);
const LIMITS = { files: 32, sourceBytes: 262_144, requestBytes: 1_048_576, outputBytes: 1_048_576, wallMs: 30_000 };
const EXTENSIONS = [".ino", ".h", ".hpp", ".c", ".cpp"];
const CORE = "arduino:avr@1.8.8";
const ALLOWED = new Set(
  readFileSync(new URL("./libraries.txt", import.meta.url), "utf8")
    .split("\n")
    .filter(Boolean)
    .map((line) => line.slice(0, line.lastIndexOf("@"))),
);
const LIBRARIES_DIR = join(process.env.ARDUINO_DIRECTORIES_USER ?? "/opt/arduino/user", "libraries");
const SKETCH_NAME = /^[A-Za-z0-9_][A-Za-z0-9_-]{0,63}$/;
const DIAGNOSTIC = /^(.+?):(\d+):(?:(\d+):)?\s*(fatal error|error|warning|note):\s*(.*)$/;

const run = promisify(execFile);
let busy = false;
let version = null;

const reply = (res, status, body) => {
  const text = JSON.stringify(body);
  res.writeHead(status, { "content-type": "application/json", "content-length": Buffer.byteLength(text) });
  res.end(text);
};

async function toolVersion() {
  if (version === null) {
    const { stdout } = await run("arduino-cli", ["version", "--format", "json"]);
    version = JSON.parse(stdout).VersionString;
  }
  return version;
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let bytes = 0;
    req.on("data", (chunk) => {
      bytes += chunk.length;
      if (bytes > LIMITS.requestBytes) {
        reject(Object.assign(new Error("The request is too large."), { status: 413 }));
        req.destroy();
      } else chunks.push(chunk);
    });
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

function checkJob(job) {
  if (typeof job !== "object" || job === null) return "Send a JSON object.";
  const { fqbn, files, libraries = [], debug = false } = job;
  if (typeof fqbn !== "string" || !/^[A-Za-z0-9_:.=,-]{1,80}$/.test(fqbn)) return "fqbn is missing or malformed.";
  if (typeof debug !== "boolean") return "debug must be true or false.";
  if (!Array.isArray(files) || files.length === 0) return "Send at least one file.";
  if (files.length > LIMITS.files) return `Send at most ${LIMITS.files} files.`;
  let bytes = 0;
  const seen = new Set();
  for (const file of files) {
    if (typeof file !== "object" || file === null || typeof file.path !== "string" || typeof file.text !== "string") return "Each file is { path, text }.";
    const { path, text } = file;
    const parts = path.split("/");
    if (path === "" || path.startsWith("/") || path.includes("\\") || path.includes("\0") || parts.some((part) => part === "" || part === "." || part === "..")) {
      return `"${path}" must be a relative path without "." or "..".`;
    }
    if (!EXTENSIONS.some((extension) => path.endsWith(extension))) return `"${path}" must end in ${EXTENSIONS.join(", ")}.`;
    if (seen.has(path)) return `"${path}" is listed twice.`;
    seen.add(path);
    bytes += Buffer.byteLength(text);
  }
  if (bytes > LIMITS.sourceBytes) return `The sources are above ${LIMITS.sourceBytes} bytes in total.`;
  if (!Array.isArray(libraries)) return "libraries must be a list.";
  for (const library of libraries) {
    if (typeof library !== "object" || library === null || typeof library.name !== "string") return "Each library is { name, version }.";
    if (!ALLOWED.has(library.name)) return `"${library.name}" is not one of the libraries this service carries.`;
  }
  return null;
}

function runCompiler(args) {
  return new Promise((resolve) => {
    const child = spawn("arduino-cli", args, { detached: true, stdio: ["ignore", "pipe", "pipe"] });
    const out = [];
    const err = [];
    let bytes = 0;
    let killedFor = null;
    const killGroup = (reason) => {
      if (killedFor !== null) return;
      killedFor = reason;
      try {
        process.kill(-child.pid, "SIGKILL");
      } catch {}
    };
    const keep = (into) => (chunk) => {
      bytes += chunk.length;
      if (bytes > LIMITS.outputBytes) killGroup("output");
      else into.push(chunk);
    };
    const timer = setTimeout(() => killGroup("timeout"), LIMITS.wallMs);
    child.stdout.on("data", keep(out));
    child.stderr.on("data", keep(err));
    child.on("error", () => killGroup("spawn"));
    child.on("close", (code) => {
      clearTimeout(timer);
      try {
        process.kill(-child.pid, "SIGKILL");
      } catch {}
      resolve({ code, killedFor, stdout: Buffer.concat(out).toString("utf8"), stderr: Buffer.concat(err).toString("utf8") });
    });
  });
}

function parseDiagnostics(text, root) {
  const diagnostics = [];
  for (const raw of text.split("\n")) {
    const line = raw.replaceAll(root, "");
    const match = DIAGNOSTIC.exec(line);
    if (match === null) continue;
    const [, file, row, column, kind, message] = match;
    diagnostics.push({
      file,
      line: Number(row),
      ...(column === undefined ? {} : { column: Number(column) }),
      severity: kind === "warning" ? "warning" : kind === "note" ? "note" : "error",
      message,
    });
    if (diagnostics.length >= 200) break;
  }
  return diagnostics;
}

function parseSize(report) {
  const sections = report?.builder_result?.executable_sections_size ?? [];
  const find = (name) => sections.find((section) => section.name === name);
  return {
    flashBytes: find("text")?.size ?? 0,
    flashMax: find("text")?.max_size ?? 0,
    ramBytes: find("data")?.size ?? 0,
    ramMax: find("data")?.max_size ?? 0,
  };
}

const NO_SIZE = { flashBytes: 0, flashMax: 0, ramBytes: 0, ramMax: 0 };

async function compile(job) {
  const started = Date.now();
  const tool = { name: "arduino-cli", version: await toolVersion() };
  const finish = (fields) => ({ diagnostics: [], size: NO_SIZE, tool, ms: Date.now() - started, ...fields });

  const entry = job.files.find((file) => file.path.endsWith(".ino"));
  const name = entry?.path.split("/").pop().slice(0, -4);
  if (name === undefined || !SKETCH_NAME.test(name)) {
    return finish({ ok: false, diagnostics: [{ severity: "error", message: "The sketch needs one .ino file with a plain name." }] });
  }

  const id = randomBytes(8).toString("hex");
  const root = `/tmp/${id}`;
  const sketch = join(root, name);
  const out = join(root, "out");
  try {
    for (const file of job.files) {
      const target = join(sketch, file === entry ? `${name}.ino` : file.path);
      await mkdir(dirname(target), { recursive: true });
      await writeFile(target, file.text);
    }
    const args = [
      "compile", "--fqbn", job.fqbn, "--format", "json",
      "--libraries", LIBRARIES_DIR,
      "--build-path", join(root, "build"),
      "--build-cache-path", "/tmp/cache",
      "--output-dir", out,
    ];
    if (job.debug) args.push("--build-property", "compiler.cpp.extra_flags=-g -Og", "--build-property", "compiler.c.extra_flags=-g -Og");
    args.push(sketch);

    const result = await runCompiler(args);
    if (result.killedFor === "timeout") return finish({ ok: false, diagnostics: [{ severity: "error", message: "compile timed out after 30 s" }] });
    if (result.killedFor === "output") return finish({ ok: false, diagnostics: [{ severity: "error", message: "the compiler wrote more than 1 MiB of output" }] });

    let report = null;
    try {
      report = JSON.parse(result.stdout);
    } catch {}
    const text = report === null ? `${result.stdout}\n${result.stderr}` : `${report.compiler_err ?? ""}\n${report.error ?? ""}`;
    const diagnostics = parseDiagnostics(text, `${sketch}/`);

    if (result.code !== 0) {
      if (diagnostics.length === 0) {
        const message = (report?.error ?? result.stderr.trim()) || "the compiler failed";
        diagnostics.push({ severity: "error", message: message.slice(0, 500).replaceAll(root, "") });
      }
      return finish({ ok: false, diagnostics, size: parseSize(report) });
    }

    const hex = await readFile(join(out, `${name}.ino.hex`), "utf8");
    if (hex.length > LIMITS.outputBytes) {
      return finish({ ok: false, diagnostics: [{ severity: "error", message: "the hex is larger than 1 MiB" }] });
    }
    const elfBase64 = job.debug ? (await readFile(join(out, `${name}.ino.elf`))).toString("base64") : undefined;
    return finish({ ok: true, hex, elfBase64, diagnostics, size: parseSize(report) });
  } catch (error) {
    const message = error?.code === "ENOSPC" ? "the scratch disk is full" : "the compile could not run";
    return finish({ ok: false, diagnostics: [{ severity: "error", message }] });
  } finally {
    await rm(root, { recursive: true, force: true }).catch(() => {});
  }
}

const server = createServer(async (req, res) => {
  try {
    if (req.method === "GET" && req.url === "/health") return reply(res, 200, { ok: true });
    if (req.method === "GET" && req.url === "/version") return reply(res, 200, { tool: "arduino-cli", version: await toolVersion(), core: CORE });
    if (req.method !== "POST" || req.url !== "/job") return reply(res, 404, { error: "not_found" });
    if (busy) return reply(res, 429, { error: "busy" });
    busy = true;
    try {
      let job;
      try {
        job = JSON.parse(await readBody(req));
      } catch (error) {
        return reply(res, error.status ?? 400, { error: error.status === 413 ? "too_large" : "bad_request" });
      }
      const problem = checkJob(job);
      if (problem !== null) return reply(res, 400, { error: "bad_request", message: problem });
      const started = Date.now();
      const result = await compile(job);
      console.log(JSON.stringify({ at: new Date().toISOString(), status: result.ok ? "ok" : "failed", ms: Date.now() - started }));
      return reply(res, 200, result);
    } finally {
      busy = false;
    }
  } catch {
    if (!res.headersSent) reply(res, 500, { error: "internal" });
  }
});

server.listen(PORT, "0.0.0.0");
