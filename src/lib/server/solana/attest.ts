import "server-only";
import { PublicKey, Transaction, type Connection } from "@solana/web3.js";
import { z } from "zod";
import { credentialAddress, issueCredentialIx } from "@/lib/solana/passport";
import { openBountiesFor } from "@/lib/solana/reads";
import { fromHex } from "@/lib/verify/hash";
import { RUN_KINDS, runLogSchema, skillHash, verifyRun } from "@/lib/verify";
import { walletAddress, type ServiceResult } from "./common";
import type { IssuerContext } from "./context";

export const attestBody = z.object({
  kind: z.enum(RUN_KINDS),
  itemId: z.string().min(1).max(64),
  sub: z.string().min(1).max(64).optional(),
  learner: walletAddress,
  run: runLogSchema,
});

export type AttestBody = z.infer<typeof attestBody>;

/** Bounties paid in one transaction; more would crowd the transaction size. */
export const MAX_BOUNTIES = 6;

export type AttestOk = {
  signature: string;
  credential: string;
  skillId: string;
  replayHash: string;
  score: number;
  paid: { bounty: string; amount: number }[];
};

const failure = (status: number, code: string, message: string) => ({ ok: false as const, status, code, message });

function alreadyInUse(error: unknown): boolean {
  const logs = (error as { logs?: unknown }).logs;
  const text = [String((error as Error)?.message ?? ""), ...(Array.isArray(logs) ? logs.map(String) : [])].join("\n");
  return /already in use/i.test(text);
}

async function send(connection: Connection, tx: Transaction, ctx: IssuerContext): Promise<string> {
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("confirmed");
  tx.feePayer = ctx.issuer.publicKey;
  tx.recentBlockhash = blockhash;
  tx.sign(ctx.issuer);
  const signature = await connection.sendRawTransaction(tx.serialize(), { preflightCommitment: "confirmed" });
  const { value } = await connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight }, "confirmed");
  if (value.err) throw Object.assign(new Error("transaction failed"), { onChain: value.err });
  return signature;
}

/**
 * H6 attest: re-run the check, then issue the credential and pay the matching
 * open bounties in the same transaction, signed and paid for by the issuer.
 */
export async function attest(ctx: IssuerContext, body: AttestBody): Promise<ServiceResult<AttestOk>> {
  const verdict = await verifyRun(body.kind, body.itemId, body.sub, body.run);
  if (!verdict.ok) {
    // A log for another item is a bad request; a run that does not pass (or cannot be re-run yet) is unprocessable.
    if (verdict.code === "mismatch") return failure(400, "run_mismatch", verdict.reason);
    return failure(422, verdict.code === "failed" ? "not_passed" : "not_verifiable", verdict.reason);
  }

  const learner = new PublicKey(body.learner);
  const hash = await skillHash(verdict.skillId);
  const credential = credentialAddress(ctx.programId, learner, hash);

  try {
    if (await ctx.connection.getAccountInfo(credential)) {
      return failure(409, "already_issued", `This wallet already holds ${verdict.skillId}.`);
    }
    const bounties = (await openBountiesFor(ctx.connection, ctx.programId, hash, learner)).slice(0, MAX_BOUNTIES);
    const tx = new Transaction().add(
      issueCredentialIx({
        programId: ctx.programId,
        issuer: ctx.issuer.publicKey,
        payer: ctx.issuer.publicKey,
        learner,
        skillId: verdict.skillId,
        skillHash: hash,
        replayHash: fromHex(verdict.replayHash),
        score: verdict.score,
        bounties: bounties.map((b) => new PublicKey(b.address)),
      }),
    );
    const signature = await send(ctx.connection, tx, ctx);
    return {
      ok: true,
      data: {
        signature,
        credential: credential.toBase58(),
        skillId: verdict.skillId,
        replayHash: verdict.replayHash,
        score: verdict.score,
        // The program refuses the whole transaction if any listed bounty does not match, so all of them paid.
        paid: bounties.map((b) => ({ bounty: b.address, amount: Number(b.lamports) })),
      },
    };
  } catch (error) {
    if (alreadyInUse(error)) return failure(409, "already_issued", `This wallet already holds ${verdict.skillId}.`);
    return failure(502, "upstream_failed", "Solana devnet did not accept the credential. Try again in a moment.");
  }
}
