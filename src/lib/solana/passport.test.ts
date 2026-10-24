// @vitest-environment node
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { Buffer } from "buffer";
import { Keypair, PublicKey } from "@solana/web3.js";
import { describe, expect, test } from "vitest";
import { tipMemo, roomOfTip } from "./actions";
import {
  DISCRIMINATORS,
  bountyAddress,
  cancelBountyIx,
  createBountyIx,
  credentialAddress,
  decodeCredential,
  issueCredentialIx,
  parseEvents,
} from "./passport";

const programId = Keypair.generate().publicKey;
const anchor = (prefix: string) => [...createHash("sha256").update(prefix).digest().subarray(0, 8)];
const snake = (name: string) => name.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);

test("every discriminator is Anchor's sha256 prefix", () => {
  for (const ix of ["issueCredential", "createBounty", "cancelBounty"] as const) expect(DISCRIMINATORS[ix]).toEqual(anchor(`global:${snake(ix)}`));
  for (const account of ["Config", "Credential", "Bounty"] as const) expect(DISCRIMINATORS[account]).toEqual(anchor(`account:${account}`));
  for (const event of ["CredentialIssued", "BountyPaid"] as const) expect(DISCRIMINATORS[event]).toEqual(anchor(`event:${event}`));
});

test("PDAs use the H6 seeds", () => {
  const learner = Keypair.generate().publicKey;
  const hash = new Uint8Array(32).fill(3);
  expect(credentialAddress(programId, learner, hash).equals(PublicKey.findProgramAddressSync([Buffer.from("cred"), learner.toBuffer(), Buffer.from(hash)], programId)[0])).toBe(true);
  const nonce = Buffer.alloc(8);
  nonce.writeBigUInt64LE(BigInt(42));
  expect(bountyAddress(programId, learner, hash, BigInt(42)).equals(PublicKey.findProgramAddressSync([Buffer.from("bounty"), learner.toBuffer(), Buffer.from(hash), nonce], programId)[0])).toBe(true);
});

test("instruction data is the discriminator and the Borsh args", () => {
  const sponsor = Keypair.generate().publicKey;
  const ix = createBountyIx({ programId, sponsor, skillId: "drone:quad5:safety", skillHash: new Uint8Array(32).fill(1), learner: null, lamports: BigInt(5_000_000), nonce: BigInt(9) });
  const d = ix.data;
  expect([...d.subarray(0, 8)]).toEqual(DISCRIMINATORS.createBounty);
  expect(d.readUInt32LE(8)).toBe(18);
  expect(d.subarray(12, 30).toString()).toBe("drone:quad5:safety");
  expect(d[62]).toBe(0);
  expect(d.readBigUInt64LE(63)).toBe(BigInt(5_000_000));
  expect(d.readBigUInt64LE(71)).toBe(BigInt(9));
  expect(d.length).toBe(79);
  expect(cancelBountyIx(programId, sponsor, sponsor).data.length).toBe(8);
});

test("decodes a credential and its events", () => {
  const learner = Keypair.generate().publicKey;
  const issuer = Keypair.generate().publicKey;
  const len = Buffer.alloc(4);
  len.writeUInt32LE(5);
  const score = Buffer.alloc(2);
  score.writeUInt16LE(80);
  const issuedAt = Buffer.alloc(8);
  issuedAt.writeBigInt64LE(BigInt(1_761_300_000));
  const data = Buffer.concat([Buffer.from(DISCRIMINATORS.Credential), learner.toBuffer(), Buffer.alloc(32, 1), len, Buffer.from("a:b:c"), Buffer.alloc(32, 2), score, issuedAt, issuer.toBuffer(), Buffer.from([7])]);
  expect(decodeCredential("x", data)).toEqual({
    address: "x",
    learner: learner.toBase58(),
    skillHash: "01".repeat(32),
    skillId: "a:b:c",
    replayHash: "02".repeat(32),
    score: 80,
    issuedAt: 1_761_300_000,
    issuer: issuer.toBase58(),
  });
  expect(decodeCredential("x", Buffer.alloc(200))).toBeNull();

  const paid = Buffer.concat([Buffer.from(DISCRIMINATORS.BountyPaid), issuer.toBuffer(), learner.toBuffer(), Buffer.alloc(8, 0)]);
  expect(parseEvents(["Program log: hi", `Program data: ${paid.toString("base64")}`, "Program data: AAAA"])).toEqual([
    { name: "BountyPaid", bounty: issuer.toBase58(), learner: learner.toBase58(), lamports: BigInt(0) },
  ]);
});

test("tip memos carry the room id", () => {
  expect(tipMemo("ab3dkq")).toBe("simlab:tip:ab3dkq");
  expect(roomOfTip("simlab:tip:ab3dkq")).toBe("ab3dkq");
  expect(() => tipMemo("ABC")).toThrow();
  expect(roomOfTip("hello")).toBeNull();
});

// The exported IDL (hx:solana-program) is the program's own description; the codec must agree with it.
const idlPath = join(process.cwd(), "src/lib/solana/idl/simlab_passport.json");

describe.runIf(existsSync(idlPath))("agrees with the exported IDL", () => {
  type IdlField = { name: string; type: unknown };
  const idl = JSON.parse(readFileSync(idlPath, "utf8")) as {
    instructions: { name: string; discriminator: number[]; accounts: { name: string; writable?: boolean; signer?: boolean }[]; args: IdlField[] }[];
    accounts: { name: string; discriminator: number[] }[];
    events: { name: string; discriminator: number[] }[];
    types: { name: string; type: { fields: IdlField[] } }[];
  };
  const ix = (name: string) => idl.instructions.find((i) => i.name === name)!;
  const fields = (name: string) => idl.types.find((t) => t.name === name)!.type.fields.map((f) => [f.name, f.type]);
  const metas = (keys: { isSigner: boolean; isWritable: boolean }[]) => keys.map((k) => [k.isSigner, k.isWritable]);
  const idlMetas = (name: string) => ix(name).accounts.map((a) => [Boolean(a.signer), Boolean(a.writable)]);
  const key = Keypair.generate().publicKey;
  const hash = new Uint8Array(32);

  test("discriminators", () => {
    expect(ix("issue_credential").discriminator).toEqual(DISCRIMINATORS.issueCredential);
    expect(ix("create_bounty").discriminator).toEqual(DISCRIMINATORS.createBounty);
    expect(ix("cancel_bounty").discriminator).toEqual(DISCRIMINATORS.cancelBounty);
    for (const a of idl.accounts) expect(a.discriminator).toEqual(DISCRIMINATORS[a.name as "Config"]);
    for (const e of idl.events) expect(e.discriminator).toEqual(DISCRIMINATORS[e.name as "BountyPaid"]);
  });

  test("account order, signers and writability", () => {
    const issue = issueCredentialIx({ programId, issuer: key, payer: key, learner: key, skillId: "a", skillHash: hash, replayHash: hash, score: 1, bounties: [] });
    expect(metas(issue.keys)).toEqual(idlMetas("issue_credential"));
    expect(metas(createBountyIx({ programId, sponsor: key, skillId: "a", skillHash: hash, learner: null, lamports: BigInt(1), nonce: BigInt(1) }).keys)).toEqual(idlMetas("create_bounty"));
    expect(metas(cancelBountyIx(programId, key, key).keys)).toEqual(idlMetas("cancel_bounty"));
  });

  test("argument and field layouts", () => {
    expect(ix("issue_credential").args.map((a) => a.name)).toEqual(["skill_id", "skill_hash", "replay_hash", "score"]);
    expect(ix("create_bounty").args.map((a) => a.name)).toEqual(["skill_id", "skill_hash", "learner", "amount", "nonce"]);
    const pubkey = "pubkey";
    const hash32 = { array: ["u8", 32] };
    expect(fields("Credential")).toEqual([["learner", pubkey], ["skill_hash", hash32], ["skill_id", "string"], ["replay_hash", hash32], ["score", "u16"], ["issued_at", "i64"], ["issuer", pubkey], ["bump", "u8"]]);
    expect(fields("Bounty")).toEqual([["sponsor", pubkey], ["skill_hash", hash32], ["skill_id", "string"], ["learner", { option: pubkey }], ["amount", "u64"], ["created_at", "i64"], ["claimed_by", { option: pubkey }], ["nonce", "u64"], ["bump", "u8"]]);
    expect(fields("Config")).toEqual([["admin", pubkey], ["issuer", pubkey], ["bump", "u8"]]);
  });
});
