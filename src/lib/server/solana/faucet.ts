import "server-only";
import { PublicKey, SystemProgram, Transaction } from "@solana/web3.js";
import { z } from "zod";
import { LAMPORTS_PER_SOL } from "@/lib/solana/config";
import { walletAddress, type ServiceResult } from "./common";
import type { IssuerContext } from "./context";

export const faucetBody = z.object({ to: walletAddress });

/** 0.02 SOL: enough for a few tips and a small bounty on devnet. */
export const FAUCET_LAMPORTS = LAMPORTS_PER_SOL / 50;
export const FAUCET_WINDOW_MS = 60 * 60 * 1000;
/** Wallets holding more than this already have plenty for the demo. */
const ENOUGH_LAMPORTS = LAMPORTS_PER_SOL / 20;
/** Left in the treasury for credential fees and rent. */
const TREASURY_RESERVE = LAMPORTS_PER_SOL / 5;

// Once per address and once per IP per hour, counted only for grants that
// went through. In memory per instance, like the shared rate limiter (H2).
const grants = new Map<string, number>();
const MAX_KEYS = 10_000;

function lastGrant(key: string, now: number): boolean {
  const at = grants.get(key);
  if (at !== undefined && now - at < FAUCET_WINDOW_MS) return true;
  grants.delete(key);
  return false;
}

function record(key: string, now: number) {
  grants.set(key, now);
  if (grants.size > MAX_KEYS) grants.delete(grants.keys().next().value as string);
}

export type FaucetOk = { signature: string; lamports: number };

export async function dripDevnetSol(ctx: IssuerContext, to: string, ip: string, now = Date.now()): Promise<ServiceResult<FaucetOk>> {
  const addressKey = `addr:${to}`;
  const ipKey = `ip:${ip}`;
  if (lastGrant(addressKey, now) || lastGrant(ipKey, now)) {
    return { ok: false, status: 429, code: "faucet_used", message: "The faucet gives each wallet and each network one drip per hour." };
  }
  // Held while the drip is in flight, so parallel requests cannot both pass; released unless it went through.
  record(addressKey, now);
  record(ipKey, now);
  let granted = false;
  const recipient = new PublicKey(to);
  try {
    const [balance, treasury] = await Promise.all([
      ctx.connection.getBalance(recipient),
      ctx.connection.getBalance(ctx.issuer.publicKey),
    ]);
    if (balance >= ENOUGH_LAMPORTS) {
      return { ok: false, status: 409, code: "enough_funds", message: "This wallet already has enough devnet SOL." };
    }
    if (treasury < FAUCET_LAMPORTS + TREASURY_RESERVE) {
      return { ok: false, status: 503, code: "faucet_dry", message: "The SimLab faucet is empty right now." };
    }
    const { blockhash, lastValidBlockHeight } = await ctx.connection.getLatestBlockhash("confirmed");
    const tx = new Transaction({ feePayer: ctx.issuer.publicKey, blockhash, lastValidBlockHeight }).add(
      SystemProgram.transfer({ fromPubkey: ctx.issuer.publicKey, toPubkey: recipient, lamports: FAUCET_LAMPORTS }),
    );
    tx.sign(ctx.issuer);
    const signature = await ctx.connection.sendRawTransaction(tx.serialize());
    const { value } = await ctx.connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight }, "confirmed");
    if (value.err) throw new Error("transfer failed");
    granted = true;
    return { ok: true, data: { signature, lamports: FAUCET_LAMPORTS } };
  } catch {
    return { ok: false, status: 502, code: "upstream_failed", message: "Solana devnet did not accept the transfer. Try again in a moment." };
  } finally {
    if (!granted) {
      grants.delete(addressKey);
      grants.delete(ipKey);
    }
  }
}
