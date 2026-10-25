import "server-only";
import postgres from "postgres";
import { env } from "@/lib/server/env";

export type Sql = postgres.Sql;

// One pool per server instance, kept on globalThis so dev reloads reuse it.
const holder = globalThis as typeof globalThis & { __iynkSql?: Sql };

/**
 * The shared Tiger Data pool, or null when DATABASE_URL isn't set (features.db).
 * Small on purpose: serverless instances each hold their own pool, and idle
 * connections close after 20 s. statement_timeout bounds every query server-side;
 * prepare is off so a PgBouncer-style pooler URL works too.
 */
export function getSql(): Sql | null {
  if (!env.DATABASE_URL) return null;
  holder.__iynkSql ??= postgres(env.DATABASE_URL, {
    max: 3,
    idle_timeout: 20,
    connect_timeout: 5,
    max_lifetime: 30 * 60,
    prepare: false,
    onnotice: () => {},
    connection: {
      application_name: "iynk",
      statement_timeout: 4000,
      idle_in_transaction_session_timeout: 10000,
    },
  });
  return holder.__iynkSql;
}
