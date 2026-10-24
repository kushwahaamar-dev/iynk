import "server-only";
import { PublicKey } from "@solana/web3.js";
import { z } from "zod";

/** A wallet address: base58 and on the ed25519 curve (a PDA cannot be a learner or a faucet target). */
export const walletAddress = z
  .string()
  .regex(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/)
  .refine((value) => {
    try {
      return PublicKey.isOnCurve(new PublicKey(value).toBytes());
    } catch {
      return false;
    }
  }, "not a wallet address");

export type ServiceResult<T> = { ok: true; data: T } | { ok: false; status: number; code: string; message: string };
