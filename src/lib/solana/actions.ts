import { Buffer } from "buffer";
import { PublicKey, SystemProgram, Transaction, TransactionInstruction, type Connection } from "@solana/web3.js";
import type { WalletContextState } from "@solana/wallet-adapter-react";
import { skillHash } from "@/lib/verify/skill";
import { bountyAddress, cancelBountyIx, createBountyIx } from "./passport";

// Transactions the learner's own wallet signs: tips and sponsor bounties.
// Credentials are issued by the server (it pays the fees), never from here.

/** SPL Memo (https://www.solana-program.com/docs/memo). */
export const MEMO_PROGRAM_ID = new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr");

const ROOM_ID = /^[23456789abcdefghjkmnpqrstuvwxyz]{6}$/;

export type Signer = Pick<WalletContextState, "publicKey" | "sendTransaction">;

export class WalletRequiredError extends Error {
  constructor() {
    super("Connect a wallet first.");
  }
}

export function tipMemo(roomId: string): string {
  if (!ROOM_ID.test(roomId)) throw new RangeError("Not a room id.");
  return `simlab:tip:${roomId}`;
}

/** Reads a tip memo back; null when the memo is not a SimLab tip. */
export function roomOfTip(memo: string): string | null {
  const m = /^simlab:tip:([23456789abcdefghjkmnpqrstuvwxyz]{6})$/.exec(memo);
  return m ? m[1] : null;
}

function memoIx(text: string, signer: PublicKey): TransactionInstruction {
  return new TransactionInstruction({
    programId: MEMO_PROGRAM_ID,
    keys: [{ pubkey: signer, isSigner: true, isWritable: false }],
    data: Buffer.from(text, "utf8"),
  });
}

async function sendAndConfirm(connection: Connection, wallet: Signer, ...ixs: TransactionInstruction[]): Promise<string> {
  if (!wallet.publicKey) throw new WalletRequiredError();
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("confirmed");
  const tx = new Transaction({ feePayer: wallet.publicKey, blockhash, lastValidBlockHeight }).add(...ixs);
  const signature = await wallet.sendTransaction(tx, connection);
  const { value } = await connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight }, "confirmed");
  if (value.err) throw new Error("The transaction failed on-chain.");
  return signature;
}

export async function sendTip(
  connection: Connection,
  wallet: Signer,
  { to, lamports, roomId }: { to: PublicKey; lamports: number; roomId: string },
): Promise<string> {
  if (!wallet.publicKey) throw new WalletRequiredError();
  if (!Number.isSafeInteger(lamports) || lamports <= 0) throw new RangeError("A tip must be a positive whole number of lamports.");
  return sendAndConfirm(
    connection,
    wallet,
    SystemProgram.transfer({ fromPubkey: wallet.publicKey, toPubkey: to, lamports }),
    memoIx(tipMemo(roomId), wallet.publicKey),
  );
}

function randomNonce(): bigint {
  const words = crypto.getRandomValues(new Uint32Array(2));
  return (BigInt(words[0]) << BigInt(32)) | BigInt(words[1]);
}

export async function createBounty(
  connection: Connection,
  wallet: Signer,
  programId: PublicKey,
  { skillId, learner, lamports }: { skillId: string; learner: PublicKey | null; lamports: bigint },
): Promise<{ signature: string; bounty: string }> {
  if (!wallet.publicKey) throw new WalletRequiredError();
  const hash = await skillHash(skillId);
  const nonce = randomNonce();
  const ix = createBountyIx({ programId, sponsor: wallet.publicKey, skillId, skillHash: hash, learner, lamports, nonce });
  const signature = await sendAndConfirm(connection, wallet, ix);
  return { signature, bounty: bountyAddress(programId, wallet.publicKey, hash, nonce).toBase58() };
}

export async function cancelBounty(connection: Connection, wallet: Signer, programId: PublicKey, bounty: PublicKey): Promise<string> {
  if (!wallet.publicKey) throw new WalletRequiredError();
  return sendAndConfirm(connection, wallet, cancelBountyIx(programId, bounty, wallet.publicKey));
}
