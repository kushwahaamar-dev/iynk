// The user's own keys, browser side. The secret reader is left out on purpose: only
// the header builder imports it straight from ./store (see boundary.test.ts).

export { parseSecret, SECRET_MAX, SECRET_MIN, type ParsedSecret, type SecretProblem } from "./format";
export {
  getMasked,
  KEYS_STORAGE_KEY,
  redact,
  removeAllKeys,
  removeKey,
  setKey,
  subscribeKeys,
  useKeys,
  type KeyKind,
  type MaskedKey,
  type SetKeyResult,
} from "./store";
