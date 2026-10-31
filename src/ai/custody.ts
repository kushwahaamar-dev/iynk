import { readSecret } from "../local/ai-profiles.ts";
import type { ProfileStore } from "../local/ai-profiles.ts";

export type SecretReader = (keyId: string) => Promise<string | null>;

export interface Custody {
  keyFor(profileId: string): Promise<string | null>;
  /** Replaces every stored key found in `text`. `found` counts the replacements. */
  scrub(text: string): Promise<{ text: string; found: number }>;
}

const REDACTED = "[redacted-secret]";

/** The one reader of stored provider keys. Nothing else under `src/` may name `readSecret`. */
export function idbSecretReader(db: Pick<IDBDatabase, "transaction">): SecretReader {
  return (keyId) => readSecret(db, keyId);
}

export function createCustody(store: ProfileStore, secrets: SecretReader): Custody {
  return {
    async keyFor(profileId) {
      const profile = await store.get(profileId);
      return profile?.keyId ? secrets(profile.keyId) : null;
    },

    async scrub(text) {
      const keyIds = new Set((await store.list()).flatMap((profile) => (profile.keyId ? [profile.keyId] : [])));
      const keys = (await Promise.all([...keyIds].map(secrets)))
        .filter((key): key is string => key !== null && key !== "")
        .sort((a, b) => b.length - a.length);
      let found = 0;
      let out = text;
      for (const key of new Set(keys)) {
        const parts = out.split(key);
        found += parts.length - 1;
        out = parts.join(REDACTED);
      }
      return { text: out, found };
    },
  };
}
