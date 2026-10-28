import "server-only";
import { z } from "zod";

/**
 * Every server setting from HX-CONTRACT H1, parsed once. A missing or malformed
 * variable never throws: it falls back to its default (or stays unset) and the
 * feature that needs it reports false, so the static core keeps working with
 * no keys at all. `envIssues` names the variables that were set but invalid;
 * it never holds a value.
 */

const text = z.string().trim().min(1);
const url = z.url({ protocol: /^https?$/ });
const wsUrl = z.url({ protocol: /^wss?$/ });
const pgUrl = z.url({ protocol: /^postgres(ql)?$/ });

const schema = {
  META_API_KEY: text.optional(),
  META_API_BASE: url.default("https://api.meta.ai/v1"),
  META_MODEL: text.default("muse-spark-1.3"),
  META_IMAGE_MODEL: text.default("muse-image-1.0"),
  META_TRANSCRIBE_MODEL: text.default("muse-voice-transcribe-1.0"),
  GEMINI_API_KEY: text.optional(),
  GEMINI_MODEL: text.default("gemini-3.5-flash"),
  SERPAPI_KEY: text.optional(),
  SERPAPI_MONTHLY_BUDGET: z.coerce.number().int().min(0).default(200),
  DATABASE_URL: pgUrl.optional(),
  NEXT_PUBLIC_REALTIME_URL: wsUrl.optional(),
  NEXT_PUBLIC_SITE_URL: url.default("http://localhost:3000"),
} as const;

type Schema = typeof schema;
export type Env = { readonly [K in keyof Schema]: z.output<Schema[K]> };
export type EnvName = keyof Schema;

export type Features = {
  ai: boolean;
  image: boolean;
  voice: boolean;
  search: boolean;
  db: boolean;
  realtime: boolean;
  gemini: boolean;
};

const URL_VARS = new Set<EnvName>(["META_API_BASE", "NEXT_PUBLIC_SITE_URL"]);

export function readEnv(source: Record<string, string | undefined>): { env: Env; issues: EnvName[] } {
  const out: Record<string, unknown> = {};
  const issues: EnvName[] = [];
  for (const name of Object.keys(schema) as EnvName[]) {
    const field = schema[name];
    const raw = source[name]?.trim();
    // An empty line in .env.local means "unset", not "invalid".
    const value = raw ? raw : undefined;
    let parsed = field.safeParse(value);
    if (!parsed.success) {
      issues.push(name);
      parsed = field.safeParse(undefined);
    }
    let result = parsed.success ? parsed.data : undefined;
    if (typeof result === "string" && URL_VARS.has(name)) result = result.replace(/\/+$/, "");
    out[name] = result;
  }
  return { env: Object.freeze(out) as Env, issues };
}

export function featuresOf(e: Env): Features {
  const meta = Boolean(e.META_API_KEY);
  const gemini = Boolean(e.GEMINI_API_KEY);
  return {
    // Gemini only stands in for Muse Spark's text work; Muse Image and voice need Meta.
    ai: meta || gemini,
    image: meta,
    voice: meta,
    search: Boolean(e.SERPAPI_KEY),
    db: Boolean(e.DATABASE_URL),
    realtime: Boolean(e.NEXT_PUBLIC_REALTIME_URL),
    gemini,
  };
}

const parsed = readEnv(process.env);

export const env: Env = parsed.env;
export const envIssues: readonly EnvName[] = Object.freeze(parsed.issues);
export const features: Readonly<Features> = Object.freeze(featuresOf(env));
