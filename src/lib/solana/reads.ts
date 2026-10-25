import bs58 from "bs58";
import { PublicKey, type Connection } from "@solana/web3.js";
import { DISCRIMINATORS, OFFSETS, decodeBounty, decodeCredential, type Bounty, type Credential } from "./passport";

// On-chain reads shared by the pages (straight from the RPC, so anyone can
// check a credential without trusting iynk) and the server routes.

const tag = (discriminator: readonly number[]) => ({ memcmp: { offset: 0, bytes: bs58.encode(Uint8Array.from(discriminator)) } });

export async function credentialsOf(connection: Connection, programId: PublicKey, learner: PublicKey): Promise<Credential[]> {
  const accounts = await connection.getProgramAccounts(programId, {
    filters: [tag(DISCRIMINATORS.Credential), { memcmp: { offset: OFFSETS.credentialLearner, bytes: learner.toBase58() } }],
  });
  return accounts
    .map(({ pubkey, account }) => decodeCredential(pubkey.toBase58(), account.data))
    .filter((c): c is Credential => c !== null)
    .sort((a, b) => b.issuedAt - a.issuedAt);
}

export async function credentialAt(connection: Connection, programId: PublicKey, address: PublicKey): Promise<Credential | null> {
  const info = await connection.getAccountInfo(address);
  if (!info || !info.owner.equals(programId)) return null;
  return decodeCredential(address.toBase58(), info.data);
}

export async function bountiesBySponsor(connection: Connection, programId: PublicKey, sponsor: PublicKey): Promise<Bounty[]> {
  const accounts = await connection.getProgramAccounts(programId, {
    filters: [tag(DISCRIMINATORS.Bounty), { memcmp: { offset: OFFSETS.bountySponsor, bytes: sponsor.toBase58() } }],
  });
  return decodeAll(accounts).sort((a, b) => b.createdAt - a.createdAt);
}

/** Every bounty for a skill, oldest first. */
export async function bountiesForSkill(connection: Connection, programId: PublicKey, skillHash: Uint8Array): Promise<Bounty[]> {
  const accounts = await connection.getProgramAccounts(programId, {
    filters: [tag(DISCRIMINATORS.Bounty), { memcmp: { offset: OFFSETS.bountySkillHash, bytes: bs58.encode(skillHash) } }],
  });
  return decodeAll(accounts).sort((a, b) => a.createdAt - b.createdAt);
}

/** Can this learner claim the bounty? Unclaimed, and open to anyone or meant for them. */
export function claimableBy(bounty: Bounty, learner: string): boolean {
  return bounty.claimedBy === null && (bounty.learner === null || bounty.learner === learner);
}

/** Open bounties for a skill that this learner may claim. */
export async function openBountiesFor(
  connection: Connection,
  programId: PublicKey,
  skillHash: Uint8Array,
  learner: PublicKey,
): Promise<Bounty[]> {
  const me = learner.toBase58();
  return (await bountiesForSkill(connection, programId, skillHash)).filter((b) => claimableBy(b, me));
}

function decodeAll(accounts: readonly { pubkey: PublicKey; account: { data: Uint8Array } }[]): Bounty[] {
  return accounts
    .map(({ pubkey, account }) => decodeBounty(pubkey.toBase58(), account.data))
    .filter((b): b is Bounty => b !== null);
}
