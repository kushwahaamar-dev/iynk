import { aiFailure, aiUser, guardAi } from "@/lib/server/ai/guard";
import { PlanInput, planBuildNight } from "@/lib/server/ai/plan";
import { json, parseBody } from "@/lib/server/http";

// No `runtime` export: cacheComponents rejects it, and Node.js is the default.
export const maxDuration = 60;

export async function POST(req: Request) {
  const refused = guardAi(req, "plan", 6);
  if (refused) return refused;
  const parsed = await parseBody(req, PlanInput);
  if (!parsed.ok) return parsed.response;
  try {
    return json(await planBuildNight(parsed.data, { signal: req.signal, user: aiUser(req) }));
  } catch (error) {
    return aiFailure(error);
  }
}
