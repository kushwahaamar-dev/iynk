// Initializes the deployed program on devnet and, with --smoke, records one
// bounty and one credential so the deploy can be checked end to end.
//
//   node scripts/devnet-setup.ts [--fund-issuer <SOL>] [--smoke]
//
// Keys come from ~/.config/solana/iynk (deployer = upgrade authority and
// admin, issuer = the server's key). Only public keys and signatures are printed.
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { homedir } from "node:os";
import { join } from "node:path";
import { parseArgs } from "node:util";

import type * as AnchorModule from "@coral-xyz/anchor";
import type { Keypair } from "@solana/web3.js";

import type { IynkPassport } from "../../src/lib/solana/idl/iynk_passport";

const anchor = createRequire(import.meta.url)("@coral-xyz/anchor") as typeof AnchorModule;
const { BN, web3 } = anchor;

const { values: flags } = parseArgs({
  options: { smoke: { type: "boolean", default: false }, "fund-issuer": { type: "string" } },
});

const SMOKE_SKILL = "board:uno-r3:lesson:deploy-check";
const url = process.env.SOLANA_RPC_URL ?? "https://api.devnet.solana.com";
const keys = join(homedir(), ".config", "solana", "iynk");

function keypair(name: string): Keypair {
  return web3.Keypair.fromSecretKey(Uint8Array.from(JSON.parse(readFileSync(join(keys, name), "utf8"))));
}

function explorer(kind: "tx" | "address", id: string): string {
  return `https://explorer.solana.com/${kind}/${id}?cluster=devnet`;
}

function sha256(text: string): number[] {
  return [...createHash("sha256").update(text, "utf8").digest()];
}

const deployer = keypair("deployer.json");
const issuer = keypair("issuer.json");
const connection = new web3.Connection(url, "confirmed");
const provider = new anchor.AnchorProvider(connection, new anchor.Wallet(deployer), { commitment: "confirmed" });
const idl = JSON.parse(readFileSync(new URL("../target/idl/iynk_passport.json", import.meta.url), "utf8"));
const program = new anchor.Program<IynkPassport>(idl, provider);
const [configAddress] = web3.PublicKey.findProgramAddressSync([Buffer.from("config")], program.programId);

const record: Record<string, string> = {
  programId: program.programId.toBase58(),
  config: configAddress.toBase58(),
  admin: deployer.publicKey.toBase58(),
  issuer: issuer.publicKey.toBase58(),
};

if (!(await connection.getAccountInfo(program.programId))) {
  console.error(`Program ${record.programId} is not deployed on ${url}. Run npm run deploy:devnet first.`);
  process.exit(1);
}

const fundIssuer = flags["fund-issuer"];
if (fundIssuer) {
  const lamports = Math.round(Number(fundIssuer) * web3.LAMPORTS_PER_SOL);
  if (!Number.isFinite(lamports) || lamports <= 0) throw new Error(`--fund-issuer needs an amount of SOL, got "${fundIssuer}"`);
  record.fundIssuer = await provider.sendAndConfirm(
    new web3.Transaction().add(
      web3.SystemProgram.transfer({ fromPubkey: deployer.publicKey, toPubkey: issuer.publicKey, lamports }),
    ),
  );
}

const existing = await program.account.config.fetchNullable(configAddress);
if (!existing) {
  record.initialize = await program.methods.initialize(issuer.publicKey).accounts({ admin: deployer.publicKey }).rpc();
} else if (!existing.issuer.equals(issuer.publicKey)) {
  console.warn(`Config issuer is ${existing.issuer.toBase58()}, not this machine's issuer key; leaving it as is.`);
}

if (flags.smoke) {
  // A bounty reserved for a throwaway learner, paid out by the credential below.
  const learner = web3.Keypair.generate().publicKey;
  const amount = await connection.getMinimumBalanceForRentExemption(0);
  const nonce = new BN(Date.now());
  const nonceBytes = nonce.toArrayLike(Buffer, "le", 8);
  const [bounty] = web3.PublicKey.findProgramAddressSync(
    [Buffer.from("bounty"), deployer.publicKey.toBuffer(), Buffer.from(sha256(SMOKE_SKILL)), nonceBytes],
    program.programId,
  );
  record.smokeLearner = learner.toBase58();
  record.smokeBounty = bounty.toBase58();
  record.createBounty = await program.methods
    .createBounty(SMOKE_SKILL, sha256(SMOKE_SKILL), learner, new BN(amount), nonce)
    .accounts({ sponsor: deployer.publicKey })
    .rpc();
  record.issueCredential = await program.methods
    .issueCredential(SMOKE_SKILL, sha256(SMOKE_SKILL), sha256(`deploy-check:${record.createBounty}`), 100)
    .accountsPartial({ learner, issuer: issuer.publicKey, payer: issuer.publicKey })
    .remainingAccounts([{ pubkey: bounty, isWritable: true, isSigner: false }])
    .signers([issuer])
    .rpc();
  const [credential] = web3.PublicKey.findProgramAddressSync(
    [Buffer.from("cred"), learner.toBuffer(), Buffer.from(sha256(SMOKE_SKILL))],
    program.programId,
  );
  record.smokeCredential = credential.toBase58();
  const paid = (await program.account.bounty.fetch(bounty)).claimedBy?.equals(learner);
  if (!paid) throw new Error("smoke check failed: the bounty was not marked as claimed by the learner");
}

for (const [name, value] of Object.entries(record)) {
  const kind = value.length > 60 ? "tx" : "address";
  console.log(`${name.padEnd(16)} ${value}\n${"".padEnd(16)} ${explorer(kind, value)}`);
}
