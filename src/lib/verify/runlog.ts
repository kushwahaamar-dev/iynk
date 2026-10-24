import { z } from "zod";

// The run log a lab page sends to /api/solana/attest (HX-CONTRACT H6). The
// server never trusts `result`: it replays `inputs` and reaches its own verdict.

export const RUN_KINDS = ["board-lessons", "board-lesson", "drone-safety", "robotics-bench", "flight-course"] as const;

export type RunKind = (typeof RUN_KINDS)[number];

export const MAX_INPUTS = 4000;

const action = z
  .object({ type: z.string().min(1).max(64) })
  .catchall(z.unknown());

export const runLogSchema = z.object({
  v: z.literal(1),
  kind: z.enum(RUN_KINDS),
  itemId: z.string().min(1).max(64),
  sub: z.string().min(1).max(64).optional(),
  seed: z.number().int().min(0).max(0xffffffff),
  inputs: z
    .array(z.object({ t: z.number().finite().min(0), action }))
    .max(MAX_INPUTS),
  result: z.object({ pass: z.boolean(), score: z.number().min(0).max(100).optional() }),
  client: z.object({ appVersion: z.string().min(1).max(32) }),
});

export type RunLog = z.infer<typeof runLogSchema>;

export type RunInput = RunLog["inputs"][number];

export type VerifyFailure = "unsupported" | "mismatch" | "failed";

export type VerifyResult =
  | { ok: true; score: number; replayHash: string; skillId: string }
  | { ok: false; code: VerifyFailure; reason: string; replayHash?: string };
