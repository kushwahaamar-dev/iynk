import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { before, describe, it } from "node:test";

import type * as AnchorModule from "@coral-xyz/anchor";
import type { Keypair, PublicKey } from "@solana/web3.js";

import type { IynkPassport } from "../../src/lib/solana/idl/iynk_passport";

// Anchor ships CommonJS. Requiring it (rather than importing) keeps BN, web3
// and the program classes from the same copy under Node's ESM loader.
const anchor = createRequire(import.meta.url)("@coral-xyz/anchor") as typeof AnchorModule;
const { BN, web3 } = anchor;

const url = process.env.ANCHOR_PROVIDER_URL ?? "";
if (!/^http:\/\/(127\.0\.0\.1|localhost):\d+\/?$/.test(url)) {
  throw new Error(`Refusing to run against "${url}". Run "npm test", which starts a local validator.`);
}

const connection = new web3.Connection(url, "confirmed");
const admin = web3.Keypair.fromSecretKey(
  Uint8Array.from(JSON.parse(readFileSync(process.env.ANCHOR_WALLET ?? "", "utf8"))),
);
const provider = new anchor.AnchorProvider(connection, new anchor.Wallet(admin), {
  commitment: "confirmed",
  preflightCommitment: "confirmed",
});
const idl = JSON.parse(readFileSync(new URL("../target/idl/iynk_passport.json", import.meta.url), "utf8"));
const program = new anchor.Program<IynkPassport>(idl, provider);

const LOADER_V3 = new web3.PublicKey("BPFLoaderUpgradeab1e11111111111111111111111");
const DECOY_PROGRAM = new web3.PublicKey("4pmj4wWv8sYtMht4bwXG9YVCyRDxQy7om4FkksE68bDR");
const SOL = web3.LAMPORTS_PER_SOL;

const issuer = web3.Keypair.generate();
const replay = sha256("inputs of a deterministic run");
let rentFloor = 0;
let nonce = 0;

function sha256(text: string): number[] {
  return [...createHash("sha256").update(text, "utf8").digest()];
}

function pda(...seeds: Uint8Array[]): PublicKey {
  return web3.PublicKey.findProgramAddressSync(seeds, program.programId)[0];
}

const configPda = pda(Buffer.from("config"));

function credentialPda(learner: PublicKey, skillId: string): PublicKey {
  return pda(Buffer.from("cred"), learner.toBuffer(), Buffer.from(sha256(skillId)));
}

async function funded(sol = 1): Promise<Keypair> {
  const keypair = web3.Keypair.generate();
  const tx = new web3.Transaction().add(
    web3.SystemProgram.transfer({ fromPubkey: admin.publicKey, toPubkey: keypair.publicKey, lamports: sol * SOL }),
  );
  await provider.sendAndConfirm(tx);
  return keypair;
}

async function balance(key: PublicKey): Promise<number> {
  return connection.getBalance(key, "confirmed");
}

async function fails(action: Promise<unknown>, expected: string): Promise<void> {
  await assert.rejects(action, (err: unknown) => {
    const e = err as { error?: { errorCode?: { code?: string } }; logs?: string[]; transactionLogs?: string[]; message?: string };
    const text = [e.error?.errorCode?.code, e.message, ...(e.logs ?? e.transactionLogs ?? [])].join("\n");
    assert.ok(text.includes(expected), `expected "${expected}" in:\n${text.slice(0, 2000)}`);
    return true;
  });
}

async function landed(signature: string) {
  const tx = await connection.getTransaction(signature, { commitment: "confirmed", maxSupportedTransactionVersion: 0 });
  assert.ok(tx?.meta, `transaction ${signature} not found`);
  return tx.meta;
}

async function eventsOf(signature: string) {
  const parser = new anchor.EventParser(program.programId, program.coder);
  return [...parser.parseLogs((await landed(signature)).logMessages ?? [])];
}

type BountyOptions = { sponsor?: Keypair; skillId: string; learner?: PublicKey; amount?: number };

async function createBounty({ sponsor = admin, skillId, learner, amount = SOL / 10 }: BountyOptions) {
  nonce += 1;
  const id = new BN(nonce);
  const nonceBytes = Buffer.alloc(8);
  nonceBytes.writeBigUInt64LE(BigInt(nonce));
  const address = pda(Buffer.from("bounty"), sponsor.publicKey.toBuffer(), Buffer.from(sha256(skillId)), nonceBytes);
  const signature = await program.methods
    .createBounty(skillId, sha256(skillId), learner ?? null, new BN(amount), id)
    .accounts({ sponsor: sponsor.publicKey })
    .signers(sponsor === admin ? [] : [sponsor])
    .rpc();
  return { address, signature };
}

function issue(skillId: string, learner: PublicKey, bounties: PublicKey[] = [], score = 100) {
  return program.methods
    .issueCredential(skillId, sha256(skillId), replay, score)
    .accountsPartial({ learner, issuer: issuer.publicKey, payer: issuer.publicKey })
    .remainingAccounts(bounties.map((pubkey) => ({ pubkey, isWritable: true, isSigner: false })))
    .signers([issuer]);
}

before(async () => {
  rentFloor = await connection.getMinimumBalanceForRentExemption(0);
  const tx = new web3.Transaction().add(
    web3.SystemProgram.transfer({ fromPubkey: admin.publicKey, toPubkey: issuer.publicKey, lamports: 10 * SOL }),
  );
  await provider.sendAndConfirm(tx);
});

describe("initialize", () => {
  it("refuses a signer that is not the upgrade authority", async () => {
    const stranger = await funded();
    await fails(
      program.methods.initialize(stranger.publicKey).accounts({ admin: stranger.publicKey }).signers([stranger]).rpc(),
      "NotUpgradeAuthority",
    );
  });

  it("refuses the ProgramData of another program, even with the same authority", async () => {
    const [decoyData] = web3.PublicKey.findProgramAddressSync([DECOY_PROGRAM.toBuffer()], LOADER_V3);
    await fails(
      program.methods.initialize(issuer.publicKey).accountsPartial({ admin: admin.publicKey, programData: decoyData }).rpc(),
      "ConstraintSeeds",
    );
  });

  it("refuses an account that is not ProgramData at all", async () => {
    await fails(
      program.methods
        .initialize(issuer.publicKey)
        .accountsPartial({ admin: admin.publicKey, programData: program.programId })
        .rpc(),
      "AccountNotProgramData",
    );
  });

  it("creates the config with the upgrade authority as admin", async () => {
    await program.methods.initialize(issuer.publicKey).accounts({ admin: admin.publicKey }).rpc();
    const config = await program.account.config.fetch(configPda);
    assert.ok(config.admin.equals(admin.publicKey));
    assert.ok(config.issuer.equals(issuer.publicKey));
    assert.equal(config.bump, web3.PublicKey.findProgramAddressSync([Buffer.from("config")], program.programId)[1]);
  });

  it("runs only once", async () => {
    await fails(program.methods.initialize(issuer.publicKey).accounts({ admin: admin.publicKey }).rpc(), "already in use");
  });
});

describe("set_issuer", () => {
  it("refuses anyone but the admin", async () => {
    const stranger = await funded();
    await fails(
      program.methods.setIssuer(stranger.publicKey).accounts({ admin: stranger.publicKey }).signers([stranger]).rpc(),
      "NotAdmin",
    );
  });

  it("rotates the issuer, and the old key stops working", async () => {
    const next = web3.Keypair.generate();
    await program.methods.setIssuer(next.publicKey).accounts({ admin: admin.publicKey }).rpc();
    assert.ok((await program.account.config.fetch(configPda)).issuer.equals(next.publicKey));

    const learner = web3.Keypair.generate().publicKey;
    await fails(issue("board:uno-r3:lessons", learner).rpc(), "NotIssuer");

    await program.methods.setIssuer(issuer.publicKey).accounts({ admin: admin.publicKey }).rpc();
    assert.ok((await program.account.config.fetch(configPda)).issuer.equals(issuer.publicKey));
  });
});

describe("create_bounty", () => {
  it("escrows an open bounty: rent plus the amount", async () => {
    const amount = SOL / 4;
    const { address } = await createBounty({ skillId: "drone:quad5:safety", amount });
    const bounty = await program.account.bounty.fetch(address);
    assert.ok(bounty.sponsor.equals(admin.publicKey));
    assert.deepEqual(bounty.skillHash, sha256("drone:quad5:safety"));
    assert.equal(bounty.skillId, "drone:quad5:safety");
    assert.equal(bounty.learner, null);
    assert.equal(bounty.amount.toNumber(), amount);
    assert.equal(bounty.claimedBy, null);
    assert.equal(bounty.nonce.toNumber(), nonce);
    assert.ok(Math.abs(bounty.createdAt.toNumber() - Date.now() / 1000) < 120);

    const info = await connection.getAccountInfo(address, "confirmed");
    assert.ok(info);
    const rent = await connection.getMinimumBalanceForRentExemption(info.data.length);
    assert.equal(info.lamports, rent + amount);
  });

  it("can reserve a bounty for one learner", async () => {
    const learner = web3.Keypair.generate().publicKey;
    const { address } = await createBounty({ skillId: "robotics:line-follower:bench", learner });
    assert.ok((await program.account.bounty.fetch(address)).learner?.equals(learner));
  });

  it("refuses a skill_hash that is not sha256(skill_id)", async () => {
    await fails(
      program.methods
        .createBounty("drone:quad5:safety", sha256("drone:whoop:safety"), null, new BN(SOL / 10), new BN(9_001))
        .accounts({ sponsor: admin.publicKey })
        .rpc(),
      "SkillHashMismatch",
    );
  });

  it("refuses an empty or over-long skill_id", async () => {
    await fails(createBounty({ skillId: "" }), "SkillIdLength");
    await fails(createBounty({ skillId: `board:${"x".repeat(59)}` }), "SkillIdLength");
  });

  it("refuses skill ids with spaces or non-ASCII characters", async () => {
    await fails(createBounty({ skillId: "board:uno r3:lessons" }), "SkillIdCharset");
    await fails(createBounty({ skillId: "board:ünö:lessons" }), "SkillIdCharset");
  });

  it("refuses an amount below the rent-exempt minimum of an empty wallet", async () => {
    await fails(createBounty({ skillId: "drone:whoop:safety", amount: rentFloor - 1 }), "BountyTooSmall");
    const { address } = await createBounty({ skillId: "drone:whoop:safety", amount: rentFloor });
    assert.equal((await program.account.bounty.fetch(address)).amount.toNumber(), rentFloor);
  });

  it("refuses to reuse a sponsor, skill and nonce", async () => {
    const skillId = "drone:racer:safety";
    await createBounty({ skillId });
    await fails(
      program.methods
        .createBounty(skillId, sha256(skillId), null, new BN(SOL / 10), new BN(nonce))
        .accounts({ sponsor: admin.publicKey })
        .rpc(),
      "already in use",
    );
  });

  it("refuses an amount the sponsor cannot cover", async () => {
    const sponsor = await funded(0.05);
    await fails(createBounty({ sponsor, skillId: "drone:octo:safety", amount: SOL }), "insufficient lamports");
  });
});

describe("cancel_bounty", () => {
  it("refuses anyone but the sponsor", async () => {
    const { address } = await createBounty({ skillId: "board:nano:lessons" });
    const stranger = await funded();
    await fails(
      program.methods
        .cancelBounty()
        .accountsPartial({ sponsor: stranger.publicKey, bounty: address })
        .signers([stranger])
        .rpc(),
      "NotSponsor",
    );
  });

  it("closes an unclaimed bounty and refunds everything to the sponsor", async () => {
    const sponsor = await funded(2);
    const { address } = await createBounty({ sponsor, skillId: "board:pico:lessons", amount: SOL / 2 });
    const held = await balance(address);
    const before = await balance(sponsor.publicKey);
    await program.methods.cancelBounty().accountsPartial({ sponsor: sponsor.publicKey, bounty: address }).signers([sponsor]).rpc();
    assert.equal(await connection.getAccountInfo(address, "confirmed"), null);
    // The provider wallet pays the fee, so the sponsor gets back exactly what the bounty held.
    assert.equal(await balance(sponsor.publicKey), before + held);
  });
});

describe("issue_credential", () => {
  it("refuses anyone but the configured issuer", async () => {
    const stranger = await funded();
    const learner = web3.Keypair.generate().publicKey;
    await fails(
      program.methods
        .issueCredential("board:uno-r3:lessons", sha256("board:uno-r3:lessons"), replay, 100)
        .accountsPartial({ learner, issuer: stranger.publicKey, payer: stranger.publicKey })
        .signers([stranger])
        .rpc(),
      "NotIssuer",
    );
  });

  it("requires the issuer's signature", async () => {
    const learner = web3.Keypair.generate().publicKey;
    const ix = await program.methods
      .issueCredential("board:uno-r3:lessons", sha256("board:uno-r3:lessons"), replay, 100)
      .accountsPartial({ learner, issuer: issuer.publicKey, payer: admin.publicKey })
      .instruction();
    for (const key of ix.keys) if (key.pubkey.equals(issuer.publicKey)) key.isSigner = false;
    await fails(provider.sendAndConfirm(new web3.Transaction().add(ix)), "AccountNotSigner");
  });

  it("refuses a skill_hash that is not sha256(skill_id)", async () => {
    const learner = web3.Keypair.generate().publicKey;
    await fails(
      program.methods
        .issueCredential("board:uno-r3:lessons", sha256("board:nano:lessons"), replay, 100)
        .accountsPartial({ learner, issuer: issuer.publicKey, payer: issuer.publicKey })
        .signers([issuer])
        .rpc(),
      "SkillHashMismatch",
    );
  });

  it("refuses an invalid skill_id", async () => {
    const learner = web3.Keypair.generate().publicKey;
    await fails(issue("flight:gates sub-30", learner).rpc(), "SkillIdCharset");
    await fails(issue(`board:${"y".repeat(59)}`, learner).rpc(), "SkillIdLength");
  });

  it("refuses a learner that is not a wallet", async () => {
    await fails(issue("board:uno-r3:lessons", configPda).rpc(), "LearnerNotWallet");
  });

  it("records the credential and emits CredentialIssued (issuer pays, as on the server)", async (t) => {
    const learner = web3.Keypair.generate().publicKey;
    const skillId = "board:uno-r3:lesson:blink";
    const signature = await issue(skillId, learner, [], 87).rpc();
    t.diagnostic(`compute units, no bounties: ${(await landed(signature)).computeUnitsConsumed}`);

    const credential = await program.account.credential.fetch(credentialPda(learner, skillId));
    assert.ok(credential.learner.equals(learner));
    assert.deepEqual(credential.skillHash, sha256(skillId));
    assert.equal(credential.skillId, skillId);
    assert.deepEqual(credential.replayHash, replay);
    assert.equal(credential.score, 87);
    assert.ok(credential.issuer.equals(issuer.publicKey));
    assert.ok(Math.abs(credential.issuedAt.toNumber() - Date.now() / 1000) < 120);

    const events = await eventsOf(signature);
    assert.equal(events.length, 1);
    assert.equal(events[0].name, "credentialIssued");
    assert.ok(events[0].data.learner.equals(learner));
    assert.equal(events[0].data.skillId, skillId);
    assert.deepEqual(events[0].data.replayHash, replay);
    assert.equal(events[0].data.score, 87);
  });

  it("issues a skill only once per learner", async () => {
    const learner = web3.Keypair.generate().publicKey;
    await issue("drone:quad5:safety", learner).rpc();
    await fails(issue("drone:quad5:safety", learner).rpc(), "already in use");
  });

  it("accepts a fee payer that is not the issuer", async () => {
    const payer = await funded();
    const learner = web3.Keypair.generate().publicKey;
    await program.methods
      .issueCredential("flight:gates:sub-45", sha256("flight:gates:sub-45"), replay, 4_210)
      .accountsPartial({ learner, issuer: issuer.publicKey, payer: payer.publicKey })
      .signers([issuer, payer])
      .rpc();
    assert.equal((await program.account.credential.fetch(credentialPda(learner, "flight:gates:sub-45"))).score, 4_210);
  });

  it("pays an open and a reserved bounty to an empty wallet in the same transaction", async () => {
    const learner = web3.Keypair.generate().publicKey;
    const skillId = "drone:cinewhoop:safety";
    const open = await createBounty({ skillId, amount: SOL / 5 });
    const reserved = await createBounty({ skillId, learner, amount: rentFloor });

    const signature = await issue(skillId, learner, [open.address, reserved.address]).rpc();

    assert.equal(await balance(learner), SOL / 5 + rentFloor);
    for (const { address } of [open, reserved]) {
      const bounty = await program.account.bounty.fetch(address);
      assert.ok(bounty.claimedBy?.equals(learner));
      const info = await connection.getAccountInfo(address, "confirmed");
      assert.ok(info);
      assert.equal(info.lamports, await connection.getMinimumBalanceForRentExemption(info.data.length));
    }

    const events = await eventsOf(signature);
    const paid = events.filter((event) => event.name === "bountyPaid");
    assert.deepEqual(
      paid.map((event) => [event.data.bounty.toBase58(), event.data.learner.toBase58(), event.data.amount.toNumber()]),
      [
        [open.address.toBase58(), learner.toBase58(), SOL / 5],
        [reserved.address.toBase58(), learner.toBase58(), rentFloor],
      ],
    );
    assert.equal(events.filter((event) => event.name === "credentialIssued").length, 1);
  });

  it("refuses a bounty reserved for someone else, and issues nothing", async () => {
    const learner = web3.Keypair.generate().publicKey;
    const skillId = "robotics:arm:bench";
    const { address } = await createBounty({ skillId, learner: web3.Keypair.generate().publicKey });
    await fails(issue(skillId, learner, [address]).rpc(), "BountyLearnerMismatch");
    assert.equal(await connection.getAccountInfo(credentialPda(learner, skillId), "confirmed"), null);
    assert.equal(await balance(learner), 0);
  });

  it("refuses a bounty for another skill", async () => {
    const learner = web3.Keypair.generate().publicKey;
    const { address } = await createBounty({ skillId: "drone:longrange:safety" });
    await fails(issue("drone:gpscam:safety", learner, [address]).rpc(), "BountySkillMismatch");
  });

  it("refuses a bounty that was already claimed", async () => {
    const skillId = "drone:delivery:safety";
    const { address } = await createBounty({ skillId });
    await issue(skillId, web3.Keypair.generate().publicKey, [address]).rpc();
    await fails(issue(skillId, web3.Keypair.generate().publicKey, [address]).rpc(), "BountyAlreadyClaimed");
  });

  it("pays a bounty listed twice in one transaction only once (the transaction fails)", async () => {
    const learner = web3.Keypair.generate().publicKey;
    const skillId = "drone:agrihex:safety";
    const { address } = await createBounty({ skillId });
    await fails(issue(skillId, learner, [address, address]).rpc(), "BountyAlreadyClaimed");
    assert.equal((await program.account.bounty.fetch(address)).claimedBy, null);
    assert.equal(await balance(learner), 0);
  });

  it("refuses a bounty passed read-only", async () => {
    const learner = web3.Keypair.generate().publicKey;
    const skillId = "drone:wing:safety";
    const { address } = await createBounty({ skillId });
    await fails(
      program.methods
        .issueCredential(skillId, sha256(skillId), replay, 100)
        .accountsPartial({ learner, issuer: issuer.publicKey, payer: issuer.publicKey })
        .remainingAccounts([{ pubkey: address, isWritable: false, isSigner: false }])
        .signers([issuer])
        .rpc(),
      "BountyNotWritable",
    );
  });

  it("refuses remaining accounts that are not bounties", async () => {
    const learner = web3.Keypair.generate().publicKey;
    await fails(issue("drone:vtol:safety", learner, [configPda]).rpc(), "AccountDiscriminatorMismatch");
    await fails(issue("drone:vtol:safety", learner, [issuer.publicKey]).rpc(), "AccountOwnedByWrongProgram");
  });

  it("pays ten bounties in one transaction within the default compute budget", async (t) => {
    const learner = web3.Keypair.generate().publicKey;
    const skillId = "flight:gates:sub-30";
    const bounties: PublicKey[] = [];
    for (let i = 0; i < 10; i += 1) bounties.push((await createBounty({ skillId, amount: rentFloor })).address);

    const signature = await issue(skillId, learner, bounties).rpc();
    const used = (await landed(signature)).computeUnitsConsumed ?? 0;
    t.diagnostic(`compute units, ten bounties: ${used}`);
    assert.ok(used > 0 && used < 200_000);
    assert.equal(await balance(learner), 10 * rentFloor);
  });

  it("will not cancel a bounty once it is claimed", async () => {
    const skillId = "drone:swarm:safety";
    const { address } = await createBounty({ skillId });
    await issue(skillId, web3.Keypair.generate().publicKey, [address]).rpc();
    await fails(
      program.methods.cancelBounty().accountsPartial({ sponsor: admin.publicKey, bounty: address }).rpc(),
      "BountyAlreadyClaimed",
    );
  });
});
