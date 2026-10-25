import { Buffer } from "buffer";
import { PublicKey, SystemProgram, TransactionInstruction, type AccountMeta } from "@solana/web3.js";

// The iynk_passport program's interface (HX-CONTRACT H6), encoded the way
// Anchor lays it out: an 8-byte discriminator (sha256("global:<ix>"),
// sha256("account:<Type>") or sha256("event:<Type>"), first 8 bytes) and then
// the Borsh fields. passport.test.ts recomputes every discriminator and checks
// them, and the field layouts, against the exported IDL once it exists.

export const DISCRIMINATORS = {
  issueCredential: [255, 193, 171, 224, 68, 171, 194, 87],
  createBounty: [122, 90, 14, 143, 8, 125, 200, 2],
  cancelBounty: [79, 65, 107, 143, 128, 165, 135, 46],
  Config: [155, 12, 170, 224, 30, 250, 204, 130],
  Credential: [145, 44, 68, 220, 67, 46, 100, 135],
  Bounty: [237, 16, 105, 198, 19, 69, 242, 234],
  CredentialIssued: [194, 216, 28, 159, 89, 29, 72, 177],
  BountyPaid: [60, 72, 10, 171, 122, 59, 238, 148],
} as const;

export type Credential = {
  address: string;
  learner: string;
  skillHash: string;
  skillId: string;
  replayHash: string;
  score: number;
  issuedAt: number;
  issuer: string;
};

export type Bounty = {
  address: string;
  sponsor: string;
  skillHash: string;
  skillId: string;
  learner: string | null;
  lamports: bigint;
  createdAt: number;
  claimedBy: string | null;
  nonce: bigint;
};

export type PassportEvent =
  | { name: "CredentialIssued"; learner: string; skillId: string; replayHash: string; score: number }
  | { name: "BountyPaid"; bounty: string; learner: string; lamports: bigint };

const hex = (bytes: Uint8Array) => Buffer.from(bytes).toString("hex");

/* ---------- PDAs ---------- */

export function configAddress(programId: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync([Buffer.from("config")], programId)[0];
}

export function credentialAddress(programId: PublicKey, learner: PublicKey, skillHash: Uint8Array): PublicKey {
  return PublicKey.findProgramAddressSync([Buffer.from("cred"), learner.toBuffer(), Buffer.from(skillHash)], programId)[0];
}

export function u64le(value: bigint): Buffer {
  const out = Buffer.alloc(8);
  out.writeBigUInt64LE(value);
  return out;
}

export function bountyAddress(programId: PublicKey, sponsor: PublicKey, skillHash: Uint8Array, nonce: bigint): PublicKey {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("bounty"), sponsor.toBuffer(), Buffer.from(skillHash), u64le(nonce)],
    programId,
  )[0];
}

/* ---------- Borsh ---------- */

class Writer {
  private parts: Buffer[] = [];
  bytes(value: Uint8Array | readonly number[]) {
    this.parts.push(Buffer.from(value as Uint8Array));
    return this;
  }
  u16(value: number) {
    const b = Buffer.alloc(2);
    b.writeUInt16LE(value);
    return this.bytes(b);
  }
  u64(value: bigint) {
    return this.bytes(u64le(value));
  }
  string(value: string) {
    const utf8 = Buffer.from(value, "utf8");
    const len = Buffer.alloc(4);
    len.writeUInt32LE(utf8.length);
    return this.bytes(len).bytes(utf8);
  }
  optionPubkey(value: PublicKey | null) {
    return value ? this.bytes([1]).bytes(value.toBuffer()) : this.bytes([0]);
  }
  done(): Buffer {
    return Buffer.concat(this.parts);
  }
}

class Reader {
  private at = 0;
  constructor(private readonly data: Buffer) {}
  take(n: number): Buffer {
    if (this.at + n > this.data.length) throw new RangeError("account data is too short");
    const out = this.data.subarray(this.at, this.at + n);
    this.at += n;
    return out;
  }
  u8 = () => this.take(1)[0];
  u16 = () => this.take(2).readUInt16LE();
  u64 = () => this.take(8).readBigUInt64LE();
  i64 = () => Number(this.take(8).readBigInt64LE());
  pubkey = () => new PublicKey(this.take(32)).toBase58();
  hash = () => hex(this.take(32));
  string = () => this.take(this.take(4).readUInt32LE()).toString("utf8");
  optionPubkey = () => (this.u8() === 1 ? this.pubkey() : null);
}

function body(data: Uint8Array, discriminator: readonly number[]): Reader | null {
  const buf = Buffer.from(data);
  if (buf.length < 8 || discriminator.some((byte, i) => buf[i] !== byte)) return null;
  return new Reader(buf.subarray(8));
}

/* ---------- accounts ---------- */

export function decodeCredential(address: string, data: Uint8Array): Credential | null {
  const r = body(data, DISCRIMINATORS.Credential);
  if (!r) return null;
  return {
    address,
    learner: r.pubkey(),
    skillHash: r.hash(),
    skillId: r.string(),
    replayHash: r.hash(),
    score: r.u16(),
    issuedAt: r.i64(),
    issuer: r.pubkey(),
  };
}

export function decodeBounty(address: string, data: Uint8Array): Bounty | null {
  const r = body(data, DISCRIMINATORS.Bounty);
  if (!r) return null;
  return {
    address,
    sponsor: r.pubkey(),
    skillHash: r.hash(),
    skillId: r.string(),
    learner: r.optionPubkey(),
    lamports: r.u64(),
    createdAt: r.i64(),
    claimedBy: r.optionPubkey(),
    nonce: r.u64(),
  };
}

export function decodeConfigIssuer(data: Uint8Array): string | null {
  const r = body(data, DISCRIMINATORS.Config);
  if (!r) return null;
  r.pubkey();
  return r.pubkey();
}

/** Offsets for getProgramAccounts memcmp filters (after the discriminator). */
export const OFFSETS = { credentialLearner: 8, bountySponsor: 8, bountySkillHash: 40 } as const;

/* ---------- instructions ---------- */

const meta = (pubkey: PublicKey, isSigner: boolean, isWritable: boolean): AccountMeta => ({ pubkey, isSigner, isWritable });

export type IssueArgs = {
  programId: PublicKey;
  issuer: PublicKey;
  payer: PublicKey;
  learner: PublicKey;
  skillId: string;
  skillHash: Uint8Array;
  replayHash: Uint8Array;
  score: number;
  /** Open bounties to pay out in the same transaction. */
  bounties: PublicKey[];
};

export function issueCredentialIx(a: IssueArgs): TransactionInstruction {
  const data = new Writer()
    .bytes(DISCRIMINATORS.issueCredential)
    .string(a.skillId)
    .bytes(a.skillHash)
    .bytes(a.replayHash)
    .u16(a.score)
    .done();
  return new TransactionInstruction({
    programId: a.programId,
    keys: [
      meta(configAddress(a.programId), false, false),
      meta(credentialAddress(a.programId, a.learner, a.skillHash), false, true),
      meta(a.learner, false, true),
      meta(a.issuer, true, false),
      meta(a.payer, true, true),
      meta(SystemProgram.programId, false, false),
      ...a.bounties.map((bounty) => meta(bounty, false, true)),
    ],
    data,
  });
}

export type CreateBountyArgs = {
  programId: PublicKey;
  sponsor: PublicKey;
  skillId: string;
  skillHash: Uint8Array;
  learner: PublicKey | null;
  lamports: bigint;
  nonce: bigint;
};

export function createBountyIx(a: CreateBountyArgs): TransactionInstruction {
  const data = new Writer()
    .bytes(DISCRIMINATORS.createBounty)
    .string(a.skillId)
    .bytes(a.skillHash)
    .optionPubkey(a.learner)
    .u64(a.lamports)
    .u64(a.nonce)
    .done();
  return new TransactionInstruction({
    programId: a.programId,
    keys: [
      meta(bountyAddress(a.programId, a.sponsor, a.skillHash, a.nonce), false, true),
      meta(a.sponsor, true, true),
      meta(SystemProgram.programId, false, false),
    ],
    data,
  });
}

export function cancelBountyIx(programId: PublicKey, bounty: PublicKey, sponsor: PublicKey): TransactionInstruction {
  return new TransactionInstruction({
    programId,
    keys: [meta(bounty, false, true), meta(sponsor, true, true)],
    data: Buffer.from(DISCRIMINATORS.cancelBounty),
  });
}

/* ---------- events ---------- */

/** Anchor events from a transaction's log lines ("Program data: <base64>"). */
export function parseEvents(logs: readonly string[]): PassportEvent[] {
  const events: PassportEvent[] = [];
  for (const line of logs) {
    const m = /^Program data: ([A-Za-z0-9+/=]+)$/.exec(line);
    if (!m) continue;
    const data = Buffer.from(m[1], "base64");
    try {
      const issued = body(data, DISCRIMINATORS.CredentialIssued);
      if (issued) {
        events.push({ name: "CredentialIssued", learner: issued.pubkey(), skillId: issued.string(), replayHash: issued.hash(), score: issued.u16() });
        continue;
      }
      const paid = body(data, DISCRIMINATORS.BountyPaid);
      if (paid) events.push({ name: "BountyPaid", bounty: paid.pubkey(), learner: paid.pubkey(), lamports: paid.u64() });
    } catch {
      // Another program's data line, or a truncated one: not ours.
    }
  }
  return events;
}
