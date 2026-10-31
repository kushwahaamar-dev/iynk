import type { Role } from "../../project/generated/types.ts";
import type { Mode } from "../modes.ts";
import type { StageReject } from "./types.ts";

export interface GateInput {
  mode: Mode;
  role: Role;
  sealedOpen: boolean;
  ladderLevel: 0 | 1 | 2 | 3;
  showMe: boolean;
  fixIt: boolean;
  applyIt: boolean;
  xTaint: boolean;
  taintConfirmed: boolean;
}

export type GateResult =
  | { offer: true; needsConfirm: boolean }
  | { offer: false; reason: "role" | "sealed_item" | "mode" | "ladder" | "not_asked" };

export function gate(i: GateInput): GateResult {
  if (i.role === "commenter" || i.role === "viewer") return { offer: false, reason: "role" };
  if (i.sealedOpen) return { offer: false, reason: "sealed_item" };
  if ((i.mode === "socratic" || i.mode === "beginner") && !(i.ladderLevel === 3 || i.showMe || i.applyIt)) {
    return { offer: false, reason: "ladder" };
  }
  if (i.mode === "debugging" && !i.fixIt) return { offer: false, reason: "not_asked" };
  return { offer: true, needsConfirm: i.xTaint && !i.taintConfirmed };
}

const INVALID_LIMIT = 3;

export class InvalidCounter {
  private n = 0;

  constructor(private readonly limit = INVALID_LIMIT) {}

  get count(): number {
    return this.n;
  }

  onInvalid(): { action: "repair"; attempt: 1 | 2 } | { action: "explain_only" } {
    this.n += 1;
    if (this.n >= this.limit) return { action: "explain_only" };
    return { action: "repair", attempt: this.n === 1 ? 1 : 2 };
  }

  onOpen(): void {
    this.n = 0;
  }

  onUserMessage(): void {
    this.n = 0;
  }
}

const MAX_INSTRUCTION = 400;

export function explainOnlyInstruction(rejects: readonly StageReject[]): string {
  const base =
    "Do not call any tools. In plain words, say what you would change and why it did not pass.";
  const reasons = [...new Set(rejects.map((r) => r.code))].join(", ");
  const text = reasons ? `${base} Reasons: ${reasons}.` : base;
  return text.length <= MAX_INSTRUCTION ? text : `${text.slice(0, MAX_INSTRUCTION - 1)}…`;
}
