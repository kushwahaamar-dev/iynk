import "server-only";
import { PublicKey } from "@solana/web3.js";
import { z } from "zod";
import { explorerUrl } from "@/lib/solana/config";
import { credentialsOf } from "@/lib/solana/reads";
import { walletAddress } from "@/lib/server/solana/common";
import { readContext } from "@/lib/server/solana/context";
import { ToolError, defineTool } from "../registry";
import { localeInput } from "./catalog";

export const getPassport = defineTool({
  name: "get_passport",
  title: "Read a iynk Proof of Build passport",
  description:
    "Lists the Proof of Build credentials a learner holds on Solana devnet: which board lessons, drone safety tests, robotics benches or flight courses they passed (skill ids such as drone:quad5:safety), the score, the replay hash the server verified before issuing it, when it was issued and a Solana Explorer link, plus iynk's public verify page for the learner. Credentials are devnet-only and cannot be transferred.",
  input: z.object({
    learner: walletAddress.describe("The learner's Solana wallet address (base58)."),
    locale: localeInput.describe("Language of the verify page link."),
  }),
  output: z.object({
    learner: z.string(),
    cluster: z.literal("devnet"),
    count: z.number().int(),
    credentials: z.array(
      z.object({
        skillId: z.string(),
        score: z.number().int(),
        issuedAt: z.string().describe("ISO time the credential was issued."),
        replayHash: z.string(),
        address: z.string().describe("The credential account on devnet."),
        explorerUrl: z.string(),
      }),
    ),
    verifyUrl: z.string().describe("Public page that shows these credentials with Solana Explorer links."),
  }),
  openWorld: true,
  idempotent: true,
  async run({ learner, locale }, ctx) {
    const solana = readContext();
    if (!solana) throw new ToolError("not_configured", "Proof of Build (the Solana program) is not set up on this deployment.");
    let found: Awaited<ReturnType<typeof credentialsOf>>;
    try {
      // The read context's connection already times out and retries each RPC call (H2).
      found = await credentialsOf(solana.connection, solana.programId, new PublicKey(learner));
    } catch {
      throw new ToolError("upstream", "Solana devnet did not answer. Try again in a moment.");
    }
    const verify = new URL(`/${locale}/verify`, ctx.siteUrl);
    verify.searchParams.set("learner", learner);
    return {
      learner,
      cluster: "devnet" as const,
      count: found.length,
      credentials: found.map((c) => ({
        skillId: c.skillId,
        score: c.score,
        // The program stores Solana's clock: Unix seconds.
        issuedAt: new Date(c.issuedAt * 1000).toISOString(),
        replayHash: c.replayHash,
        address: c.address,
        explorerUrl: explorerUrl("address", c.address),
      })),
      verifyUrl: verify.toString(),
    };
  },
});
