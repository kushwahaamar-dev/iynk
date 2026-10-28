export type ProtocolErrorKind =
  | "worker_start_timeout"
  | "worker_killed"
  | "call_timeout"
  | "bad_message"
  | "aborted";

/** The port itself failed: the worker never started, died, or did not answer. */
export class ProtocolError extends Error {
  kind: ProtocolErrorKind;

  constructor(kind: ProtocolErrorKind, message: string) {
    super(message);
    this.name = "ProtocolError";
    this.kind = kind;
  }
}

/** The shape of an `error` reply on the wire. `kind` belongs to the worker's own vocabulary. */
export interface ErrorBody {
  kind: string;
  message: string;
  hint?: string;
}

/** The worker handled the request and answered with an error. */
export class WorkerError extends Error {
  kind: string;
  hint?: string;

  constructor(body: ErrorBody) {
    super(body.message);
    this.name = "WorkerError";
    this.kind = body.kind;
    this.hint = body.hint;
  }
}
