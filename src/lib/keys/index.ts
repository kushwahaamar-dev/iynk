// The user's own keys, browser side. The secret reader is left out on purpose: only
// the header builder imports it straight from ./store (see boundary.test.ts).

export { parseSecret, SECRET_MAX, SECRET_MIN, type ParsedSecret, type SecretProblem } from "./format";
export {
  getMasked,
  hydrateKeys,
  KEYS_STORAGE_KEY,
  redact,
  removeAllKeys,
  removeKey,
  restoreKeysToLocalStorage,
  setKey,
  subscribeKeys,
  useKeys,
  type HydrateResult,
  type KeyKind,
  type KeyRow,
  type KeySlot,
  type KeysBackend,
  type MaskedKey,
  type SetKeyResult,
} from "./store";
