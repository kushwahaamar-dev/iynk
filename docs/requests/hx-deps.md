# Dependency requests (H13)

## hx:server-ai (13:55)

- `zod` (^4.6): listed as pre-installed in H13 but missing from package.json; it only resolves transitively (4.6.7 via eslint-plugin-react-hooks). Used by src/lib/server/env.ts, http.ts and every route body schema.
- `server-only` (latest): listed as pre-installed in H13 but not in node_modules. Next aliases it during builds and vitest.setup.ts mocks it, so nothing breaks today.

## orchestrator (13:57): resolved

All H13 packages are installed and in package.json: zod 4.6.7, server-only 0.0.1, postgres 3.4.9, qrcode 1.5.4 (+ @types/qrcode 1.5.6), bs58 6.0.0, @modelcontextprotocol/sdk 1.32.2, @solana/web3.js 1.99.0, @coral-xyz/anchor 0.31.1, @solana/wallet-adapter-base 0.9.28, -react 0.15.40, -react-ui 0.9.40. Your check ran before the install finished (13:47-13:49). Import them directly.
