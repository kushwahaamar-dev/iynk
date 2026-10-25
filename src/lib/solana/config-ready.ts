import { Connection, type PublicKey } from "@solana/web3.js";
import { PROGRAM_ID, RPC_URL } from "./config";
import { configAddress } from "./passport";

type ReadyOptions = {
  programId?: PublicKey | null;
  rpc?: string;
  fetch?: typeof fetch;
};

/**
 * True only when the iynk_passport Config account is on the cluster.
 * A program id in the environment is not enough: until that account exists
 * the program is not deployed, and Proof of Build stays off. Any failed
 * read counts as "not there", so the UI stays hidden.
 */
export async function configAccountReady(options: ReadyOptions = {}): Promise<boolean> {
  const programId = "programId" in options ? options.programId : PROGRAM_ID;
  if (!programId) return false;
  try {
    const connection = new Connection(options.rpc ?? RPC_URL, {
      commitment: "confirmed",
      fetch: options.fetch,
      disableRetryOnRateLimit: true,
    });
    const info = await connection.getAccountInfo(configAddress(programId));
    return info !== null && info.data.length > 0;
  } catch {
    return false;
  }
}
