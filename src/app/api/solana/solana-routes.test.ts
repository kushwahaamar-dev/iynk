// @vitest-environment node
import { Buffer } from "buffer";
import { Keypair, PublicKey, Transaction } from "@solana/web3.js";
import { beforeEach, describe, expect, test, vi } from "vitest";
import type { IssuerContext } from "@/lib/server/solana/context";
import { DISCRIMINATORS, credentialAddress, u64le } from "@/lib/solana/passport";
import type { BenchEvent } from "@/lib/verify/drone-safety";
import { replayHash, sha256, toHex } from "@/lib/verify/hash";

vi.mock("next/server", () => ({ connection: async () => {} }));

const context = vi.hoisted(() => ({ current: null as IssuerContext | null }));
vi.mock("@/lib/server/solana/context", () => ({
  issuerContext: () => context.current,
  readContext: () => context.current,
}));

const { POST: attestPOST } = await import("./attest/route");
const { POST: faucetPOST } = await import("./faucet/route");
const { GET: credentialsGET } = await import("./credentials/route");

const programId = Keypair.generate().publicKey;
const issuer = Keypair.generate();
const learner = Keypair.generate().publicKey;

type Account = { pubkey: PublicKey; account: { data: Buffer; owner: PublicKey; lamports: number; executable: boolean } };

function fakeConnection() {
  const sent: Transaction[] = [];
  const state = {
    accounts: new Map<string, Account["account"]>(),
    programAccounts: [] as Account[],
    balances: new Map<string, number>([[issuer.publicKey.toBase58(), 5_000_000_000]]),
    failSend: null as Error | null,
  };
  const connection = {
    getAccountInfo: vi.fn(async (key: PublicKey) => state.accounts.get(key.toBase58()) ?? null),
    getProgramAccounts: vi.fn(async (_id: PublicKey, config: { filters: { memcmp: { offset: number; bytes: string } }[] }) => {
      // Applies the memcmp filters the way the RPC does.
      const bs58 = (await import("bs58")).default;
      return state.programAccounts.filter(({ account }) =>
        config.filters.every(({ memcmp }) => {
          const want = Buffer.from(bs58.decode(memcmp.bytes));
          return account.data.subarray(memcmp.offset, memcmp.offset + want.length).equals(want);
        }),
      );
    }),
    getLatestBlockhash: vi.fn(async () => ({ blockhash: Keypair.generate().publicKey.toBase58(), lastValidBlockHeight: 100 })),
    sendRawTransaction: vi.fn(async (raw: Buffer) => {
      if (state.failSend) throw state.failSend;
      const tx = Transaction.from(raw);
      sent.push(tx);
      return `sig${sent.length}`;
    }),
    confirmTransaction: vi.fn(async () => ({ value: { err: null } })),
    getBalance: vi.fn(async (key: PublicKey) => state.balances.get(key.toBase58()) ?? 0),
  };
  return { connection, sent, state };
}

function bountyData(sponsor: PublicKey, skillId: string, hash: Uint8Array, opts: { learner?: PublicKey; claimedBy?: PublicKey; lamports: number }) {
  const option = (key?: PublicKey) => (key ? Buffer.concat([Buffer.from([1]), key.toBuffer()]) : Buffer.from([0]));
  const len = Buffer.alloc(4);
  len.writeUInt32LE(Buffer.byteLength(skillId));
  return Buffer.concat([
    Buffer.from(DISCRIMINATORS.Bounty),
    sponsor.toBuffer(),
    Buffer.from(hash),
    len,
    Buffer.from(skillId),
    option(opts.learner),
    u64le(BigInt(opts.lamports)),
    u64le(BigInt(1_700_000_000)),
    option(opts.claimedBy),
    u64le(BigInt(1)),
    Buffer.from([255]),
  ]);
}

const programAccount = (data: Buffer): Account => ({
  pubkey: Keypair.generate().publicKey,
  account: { data, owner: programId, lamports: 1, executable: false },
});

const BUILT = { FRAME: 0, MOTORS: 0, ESC: 0, WIRES: 0, FC: 0, XT60: 0, CAM: 0, RX: 0, VTX: 0, TOP: 0, BATT: 0, PROPS: 0 } as const;
const GOOD: BenchEvent[] = [
  { type: "init", placed: { ...BUILT }, plugged: false, fault: null, smokeOk: true, motorOk: true, accOk: true },
  { type: "remove", id: "PROPS" },
  { type: "test", test: "smoke" },
  { type: "test-end", test: "smoke" },
  { type: "test", test: "motors" },
  { type: "test-end", test: "motors" },
  { type: "unplug" },
  { type: "test", test: "calibrate" },
  { type: "test-end", test: "calibrate" },
  { type: "add", id: "PROPS", orient: 0 },
];

const runLog = (events: BenchEvent[], itemId = "quad5") => ({
  v: 1,
  kind: "drone-safety",
  itemId,
  seed: 1,
  inputs: events.map((action, i) => ({ t: i * 400, action })),
  result: { pass: true, score: 100 },
  client: { appVersion: "test" },
});

let ip = 0;
const post = (path: string, body: unknown, headers: Record<string, string> = {}) =>
  new Request(`http://localhost${path}`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-real-ip": `10.0.0.${++ip}`, ...headers },
    body: JSON.stringify(body),
  });

let fake: ReturnType<typeof fakeConnection>;
beforeEach(() => {
  fake = fakeConnection();
  context.current = { connection: fake.connection as never, programId, issuer };
});

describe("POST /api/solana/attest", () => {
  const body = (events = GOOD, itemId = "quad5") => ({ kind: "drone-safety", itemId, learner: learner.toBase58(), run: runLog(events, itemId) });

  test("re-runs the check, issues the credential and pays the matching bounties", async () => {
    const hash = await sha256("drone:quad5:safety");
    const sponsor = Keypair.generate().publicKey;
    const open = programAccount(bountyData(sponsor, "drone:quad5:safety", hash, { lamports: 50_000_000 }));
    const mine = programAccount(bountyData(sponsor, "drone:quad5:safety", hash, { learner, lamports: 10_000_000 }));
    const someoneElse = programAccount(bountyData(sponsor, "drone:quad5:safety", hash, { learner: sponsor, lamports: 1 }));
    const claimed = programAccount(bountyData(sponsor, "drone:quad5:safety", hash, { claimedBy: sponsor, lamports: 1 }));
    const otherSkill = programAccount(bountyData(sponsor, "drone:racer:safety", await sha256("drone:racer:safety"), { lamports: 1 }));
    fake.state.programAccounts.push(open, mine, someoneElse, claimed, otherSkill);

    const res = await attestPOST(post("/api/solana/attest", body()));
    expect(res.status).toBe(200);
    const json = await res.json();
    const credential = credentialAddress(programId, learner, hash).toBase58();
    expect(json).toMatchObject({ signature: "sig1", credential, skillId: "drone:quad5:safety", score: 100 });
    expect(json.replayHash).toBe(await replayHash(runLog(GOOD).inputs));
    expect(json.paid.map((p: { bounty: string }) => p.bounty).sort()).toEqual([open.pubkey.toBase58(), mine.pubkey.toBase58()].sort());

    const [tx] = fake.sent;
    expect(tx.signatures.find((s) => s.publicKey.equals(issuer.publicKey))?.signature).toBeTruthy();
    const ix = tx.instructions[0];
    expect(ix.programId.equals(programId)).toBe(true);
    expect([...ix.data.subarray(0, 8)]).toEqual([...DISCRIMINATORS.issueCredential]);
    expect(toHex(ix.data.subarray(ix.data.length - 34, ix.data.length - 2))).toBe(json.replayHash);
    expect(ix.keys.map((k) => k.pubkey.toBase58())).toContain(credential);
    expect(ix.keys.slice(-2).map((k) => k.pubkey.toBase58()).sort()).toEqual(json.paid.map((p: { bounty: string }) => p.bounty).sort());
  });

  test("answers 409 when the credential exists", async () => {
    const hash = await sha256("drone:quad5:safety");
    fake.state.accounts.set(credentialAddress(programId, learner, hash).toBase58(), programAccount(Buffer.alloc(8)).account);
    const res = await attestPOST(post("/api/solana/attest", body()));
    expect(res.status).toBe(409);
    expect((await res.json()).error.code).toBe("already_issued");
    expect(fake.sent).toHaveLength(0);
  });

  test("maps a lost race on the credential account to 409", async () => {
    fake.state.failSend = Object.assign(new Error("Simulation failed"), { logs: ["Allocate: account Address { .. } already in use"] });
    const res = await attestPOST(post("/api/solana/attest", body()));
    expect(res.status).toBe(409);
  });

  test("refuses a run that does not pass, without sending anything", async () => {
    const res = await attestPOST(post("/api/solana/attest", body(GOOD.slice(0, 6))));
    expect(res.status).toBe(422);
    expect((await res.json()).error.code).toBe("not_passed");
    expect(fake.sent).toHaveLength(0);
  });

  test("refuses a tampered log", async () => {
    const tampered = { ...body(), itemId: "racer" };
    const res = await attestPOST(post("/api/solana/attest", tampered));
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("run_mismatch");
  });

  test("validates the body", async () => {
    const res = await attestPOST(post("/api/solana/attest", { ...body(), learner: "not-an-address" }));
    expect(res.status).toBe(400);
    const res2 = await attestPOST(new Request("http://localhost/api/solana/attest", { method: "POST", body: "{}", headers: { "content-type": "text/plain" } }));
    expect(res2.status).toBe(415);
  });

  test("reports an RPC failure as 502 without details", async () => {
    fake.state.failSend = new Error("fetch failed: https://secret-rpc.example");
    const res = await attestPOST(post("/api/solana/attest", body()));
    expect(res.status).toBe(502);
    expect(JSON.stringify(await res.json())).not.toContain("secret-rpc");
  });

  test("says when Solana is not set up", async () => {
    context.current = null;
    const res = await attestPOST(post("/api/solana/attest", body()));
    expect(res.status).toBe(503);
    expect((await res.json()).error.code).toBe("not_configured");
  });

  test("refuses other origins", async () => {
    const res = await attestPOST(post("/api/solana/attest", body(), { origin: "https://evil.example" }));
    expect(res.status).toBe(403);
  });
});

describe("POST /api/solana/faucet", () => {
  test("drips 0.02 SOL once per address and once per IP per hour", async () => {
    const to = Keypair.generate().publicKey.toBase58();
    const first = await faucetPOST(post("/api/solana/faucet", { to }, { "x-real-ip": "192.168.1.1" }));
    expect(first.status).toBe(200);
    expect(await first.json()).toEqual({ signature: "sig1", lamports: 20_000_000 });
    expect(fake.sent[0].instructions[0].programId.toBase58()).toBe("11111111111111111111111111111111");

    const again = await faucetPOST(post("/api/solana/faucet", { to }, { "x-real-ip": "192.168.1.2" }));
    expect(again.status).toBe(429);
    const sameIp = await faucetPOST(post("/api/solana/faucet", { to: Keypair.generate().publicKey.toBase58() }, { "x-real-ip": "192.168.1.1" }));
    expect(sameIp.status).toBe(429);
  });

  test("a failed drip does not use up the hour", async () => {
    const to = Keypair.generate().publicKey.toBase58();
    fake.state.failSend = new Error("rpc down");
    expect((await faucetPOST(post("/api/solana/faucet", { to }))).status).toBe(502);
    fake.state.failSend = null;
    expect((await faucetPOST(post("/api/solana/faucet", { to }))).status).toBe(200);
  });

  test("skips wallets that already have devnet SOL", async () => {
    const to = Keypair.generate().publicKey;
    fake.state.balances.set(to.toBase58(), 1_000_000_000);
    const res = await faucetPOST(post("/api/solana/faucet", { to: to.toBase58() }));
    expect(res.status).toBe(409);
    expect(fake.sent).toHaveLength(0);
  });
});

describe("GET /api/solana/credentials", () => {
  test("lists a learner's credentials from the program accounts", async () => {
    const hash = await sha256("drone:quad5:safety");
    const len = Buffer.alloc(4);
    len.writeUInt32LE(18);
    const score = Buffer.alloc(2);
    score.writeUInt16LE(90);
    const data = Buffer.concat([
      Buffer.from(DISCRIMINATORS.Credential),
      learner.toBuffer(),
      Buffer.from(hash),
      len,
      Buffer.from("drone:quad5:safety"),
      Buffer.alloc(32, 7),
      score,
      u64le(BigInt(1_761_300_000)),
      issuer.publicKey.toBuffer(),
      Buffer.from([254]),
    ]);
    fake.state.programAccounts.push(programAccount(data), programAccount(bountyData(learner, "x", hash, { lamports: 1 })));
    const res = await credentialsGET(new Request(`http://localhost/api/solana/credentials?learner=${learner.toBase58()}`));
    expect(res.status).toBe(200);
    const { credentials } = await res.json();
    expect(credentials).toHaveLength(1);
    expect(credentials[0]).toMatchObject({ learner: learner.toBase58(), skillId: "drone:quad5:safety", score: 90, issuedAt: 1_761_300_000, issuer: issuer.publicKey.toBase58(), replayHash: "07".repeat(32) });
  });

  test("validates the learner", async () => {
    const res = await credentialsGET(new Request("http://localhost/api/solana/credentials?learner=nope"));
    expect(res.status).toBe(400);
  });
});
