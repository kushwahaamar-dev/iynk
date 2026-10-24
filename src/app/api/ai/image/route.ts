import { z } from "zod";
import { aiFailure, aiUser, guardAi } from "@/lib/server/ai/guard";
import { colorfiguresImagePrompt } from "@/lib/server/ai/prompts/image";
import { generateImage } from "@/lib/server/ai/provider";
import type { ImageResponse } from "@/lib/server/ai/types";
import { json, parseBody } from "@/lib/server/http";

// No `runtime` export: cacheComponents rejects it, and Node.js is the default.
export const maxDuration = 120;

const Body = z.object({
  prompt: z.string().trim().min(3).max(600),
  style: z.literal("colorfigures"),
});

export async function POST(req: Request) {
  const refused = guardAi(req, "image", 3, "image");
  if (refused) return refused;
  const parsed = await parseBody(req, Body, { maxBytes: 8 * 1024 });
  if (!parsed.ok) return parsed.response;
  try {
    const { dataUrl } = await generateImage({
      prompt: colorfiguresImagePrompt(parsed.data.prompt),
      signal: req.signal,
      user: aiUser(req),
    });
    return json({ image: dataUrl } satisfies ImageResponse);
  } catch (error) {
    return aiFailure(error);
  }
}
