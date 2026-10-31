import { isMainThread, parentPort, Worker, workerData } from "node:worker_threads";
import { utf8Length } from "../../../src/core/canonical.ts";
import type { Project } from "../../../src/project/generated/types.ts";
import { stateHash } from "../../../src/project/hash.ts";
import { toCanonicalText } from "../../../src/project/normalize.ts";
import { validateValue } from "../../../src/project/validate.ts";

export type WorkerResult =
  | { ok: true; doc: Project; canonicalBytes: number; stateHash: string }
  | { ok: false; code: string; message: string };

const MAX_HEAP_MB = 512;

function validate(doc: unknown): WorkerResult {
  const report = validateValue(doc);
  if (report.ok && report.doc) {
    return { ok: true, doc: report.doc, canonicalBytes: utf8Length(toCanonicalText(report.doc)), stateHash: stateHash(report.doc) };
  }
  if (report.diagnostics.some((d) => d.code === "V4-SIZE")) {
    return { ok: false, code: "quota", message: "The project is larger than a share may be." };
  }
  const first = report.diagnostics.find((d) => d.severity === "error");
  return { ok: false, code: first?.code ?? "invalid_document", message: first?.message ?? "The document is not valid." };
}

if (!isMainThread && (workerData as { task?: string } | null)?.task === "validate-share") {
  const { doc } = workerData as { doc: unknown };
  let result: WorkerResult;
  try {
    result = validate(doc);
  } catch {
    result = { ok: false, code: "validation_failed", message: "The project could not be checked." };
  }
  parentPort?.postMessage(result);
}

/** Runs the validation passes in a thread that is killed at the limit, so a hostile document cannot hold the server. */
export function validateInWorker(doc: unknown, timeoutMs: number): Promise<WorkerResult> {
  return new Promise((resolve) => {
    const worker = new Worker(new URL(import.meta.url), {
      workerData: { task: "validate-share", doc },
      resourceLimits: { maxOldGenerationSizeMb: MAX_HEAP_MB },
    });
    const finish = (result: WorkerResult): void => {
      clearTimeout(timer);
      void worker.terminate();
      resolve(result);
    };
    const timer = setTimeout(
      () => finish({ ok: false, code: "validation_timeout", message: "The project took too long to check." }),
      timeoutMs,
    );
    worker.once("message", (result: WorkerResult) => finish(result));
    worker.once("error", () => finish({ ok: false, code: "validation_failed", message: "The project could not be checked." }));
    worker.once("exit", () => finish({ ok: false, code: "validation_failed", message: "The project could not be checked." }));
  });
}
