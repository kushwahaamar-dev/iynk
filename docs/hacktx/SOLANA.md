# iynk_passport: the Proof of Build program (hx:solana-program)

An Anchor program on Solana devnet that records verified iynk skills as credentials and pays sponsor bounties in the same instruction. It implements HX-CONTRACT H6; the additive changes are in the changelog at the bottom. Everything here was written on 2026-10-24 during the hacking period.

The iynk server re-runs a learner's deterministic lab run (`verifyRun`, hx:solana-app) and, when it passes, the issuer key sends `issue_credential`. The program never trusts the client: only the configured issuer can issue, every credential is one per learner and skill, and a bounty can only be paid once, to the right learner, for the right skill.

## Status

| | |
|---|---|
| Program id | `BYFLDTLNi946Z8jT4JnxgE8Cpzkr9ud7tSrnThFTv31w` |
| Config PDA | `FvZdCHZeEt5gUtRVtx6kHp35M6h2BDhxTRXMmWsCrpci` |
| Upgrade authority and admin (deployer) | `3sU7fwSukdG77nH2HciyXQ7Vsao1ZCdERXc73TmP9PZb` |
| Issuer (server key, fee payer, faucet treasury) | `7GbNpdhX6yNqcGXSNXJxYU3aidoyrToNDsUoEe5845XR` |
| Built and tested | yes: 34 tests on a local validator, all passing |
| Deployed to devnet | **yes**, 2026-10-25 09:48 CDT in slot 515005280, after Amar moved 3.0 devnet SOL from his wallet (2.3 to the deployer, 0.7 to the issuer). The writes went over TPU because the public RPC was rate-limiting the Mac; `deploy-devnet.sh` uses `--use-rpc` |

Explorer: [program](https://explorer.solana.com/address/BYFLDTLNi946Z8jT4JnxgE8Cpzkr9ud7tSrnThFTv31w?cluster=devnet) · [deployer](https://explorer.solana.com/address/3sU7fwSukdG77nH2HciyXQ7Vsao1ZCdERXc73TmP9PZb?cluster=devnet) · [issuer](https://explorer.solana.com/address/7GbNpdhX6yNqcGXSNXJxYU3aidoyrToNDsUoEe5845XR?cluster=devnet)

### To finish the deploy

1. On devnet, fund the deployer `3sU7fwSukdG77nH2HciyXQ7Vsao1ZCdERXc73TmP9PZb` with **at least 2.1 SOL** (the deploy and its IDL) and the issuer `7GbNpdhX6yNqcGXSNXJxYU3aidoyrToNDsUoEe5845XR` with **0.5 to 1 SOL** (credential rent, fees and the faucet's 0.02 SOL drops). Sign in at https://faucet.solana.com with GitHub for the larger limit.
2. Run:
   ```sh
   cd solana
   npm run deploy:devnet              # program + on-chain IDL
   npm run setup:devnet -- --smoke    # initialize, then one bounty and the credential that pays it
   ```
   If only the deployer was funded, add `--fund-issuer 0.5` to the second command to move SOL across.
3. Paste the printed signatures into the deploy record below.

The same two commands were rehearsed end to end on a local validator started with devnet's feature set (`solana-test-validator --clone-feature-set --url devnet`): first deploy, IDL publish, upgrade, initialize, a bounty, and a credential that paid it. hx:solana-app's hand-written encoders in `src/lib/solana/passport.ts` were run against that program too: create, cancel, issue with two bounties, event parsing and every decoder agreed with the chain.

### Deploy record

| Step | Signature |
|---|---|
| Deploy | `stRPrCMzctgEMjvE9h6GtLFLCsBU3Xo3Buwsun64ED9kUqpqF824rWsEevfmFDnWaearB34MSVeoJjdhs456PRQ` |
| IDL publish | IDL account `EjaBdebJUgMoAEFf2A1mYw91sJTVu9UMNERsKyP6ZWFR` |
| initialize | `iSK61DxqTf7tVF33Qhu17V9FbBxwH547ekuR9douivsPueL8xLph13zTe5AT2P6VMEy4nLxJJfrCWiPqKoRs6D7` |
| create_bounty (smoke, reserved for a throwaway learner) | `5vwR1KY1cYbqfy9Lti9L659moztYzYVu6T3M4euSkHQTws1cM495TbAQ9ozTgQmm2jrEdNjSB15DYzqENfghaoC8` (bounty `hdgZP2WbNHRYSV15mi71jo4mas8yaEuwnNaiCXY9m6p`) |
| issue_credential (smoke, pays that bounty) | `5hpwnkbSmqKFCqUDEpgWv8hh4znm8P2qtR1dGmHGuvds5UQ22nVfBPtUvQwT8FMUe8h7Yw27E43B83N9wcX5L1nP` (learner `F2vKneRRUic1ajdMZWWXU6BPWiEcow8x9qMvvqjYopwm`, credential `Bvp7uUutKW3mbNAeb74aamXmi9tuCjxdKVwuTXQD8Nqu`) |

The smoke credential uses the skill id `board:uno-r3:lesson:deploy-check`, so it can never be mistaken for a real pass.

## Accounts

All three are PDAs of the program. Discriminators are Anchor's default (first 8 bytes of `sha256("account:<Name>")`, listed in the IDL). Space is allocated for the longest `skill_id`, but Borsh writes strings and options compactly, so only the fields before `skill_id` sit at fixed offsets.

| Account | Seeds | Fields (in order) | Space | Rent |
|---|---|---|---|---|
| Config | `["config"]` | admin: Pubkey, issuer: Pubkey, bump: u8 | 73 B | 0.0014 SOL |
| Credential | `["cred", learner, skill_hash]` | learner, skill_hash: [u8;32], skill_id: String (≤ 64), replay_hash: [u8;32], score: u16, issued_at: i64, issuer: Pubkey, bump | 215 B | 0.0024 SOL |
| Bounty | `["bounty", sponsor, skill_hash, nonce as u64 LE]` | sponsor, skill_hash, skill_id: String (≤ 64), learner: Option<Pubkey>, amount: u64, created_at: i64, claimed_by: Option<Pubkey>, nonce: u64, bump | 231 B | 0.0025 SOL |

`getProgramAccounts` filters that work: discriminator at offset 0, `Credential.learner` at 8, `Credential.skill_hash` at 40, `Bounty.sponsor` at 8, `Bounty.skill_hash` at 40. Filter `claimed_by` and `learner` on the client.

A Bounty holds its rent plus `amount` lamports. A payout moves `amount` to the learner and keeps the account (with `claimed_by` set) as the public record of the payout, so its rent stays with it. A cancel closes it and returns everything to the sponsor.

Constants in the IDL: `CONFIG_SEED`, `CREDENTIAL_SEED`, `BOUNTY_SEED`.

## Instructions

Accounts are listed in the order the instruction expects them. S = signer, W = writable.

**initialize(issuer: Pubkey)**: admin (S, W, pays), config (W, init), program_data, system_program.
Creates Config with `admin = signer`. `program_data` must be this program's own ProgramData (seeds `[program_id]` under the upgradeable loader) and its upgrade authority must be the signer, so nobody can claim the config between a deploy and its initialize. Runs once; a second call fails because Config exists.

**set_issuer(issuer: Pubkey)**: admin (S), config (W).
`has_one = admin`, seeds and bump checked.

**issue_credential(skill_id: String, skill_hash: [u8;32], replay_hash: [u8;32], score: u16)**: config, credential (W, init), learner (W), issuer (S), payer (S, W), system_program, then bounties (W) as remaining accounts.
- `config.issuer` must be the signing issuer (`has_one`), and config's seeds and bump are checked.
- `skill_id` is 1 to 64 bytes of printable ASCII with no spaces, and `skill_hash` must equal `sha256(skill_id)`, computed on chain.
- `learner` must be owned by the System Program (a wallet, funded or not). That keeps program accounts out of payouts.
- The credential is created with `init`, so a learner gets a skill once; a second issue fails with the System Program's "already in use".
- The issuer and the payer may be the same key; the server uses one key for both.
- For each remaining account, in order: it must be writable, owned by this program and carry the Bounty discriminator. Only `create_bounty` writes such accounts, and only at the bounty PDA, so this proves it is a real bounty without re-deriving the address. Its `skill_hash` must match, `claimed_by` must be empty, and `learner` must be empty or equal the learner. Then `amount` moves from the bounty to the learner with checked arithmetic, `claimed_by` is set, and the account is written back before the next one is read. A bounty listed twice therefore fails as already claimed, and the whole transaction rolls back, credential included.
- Emits `CredentialIssued`, plus one `BountyPaid` per bounty.

**create_bounty(skill_id: String, skill_hash: [u8;32], learner: Option<Pubkey>, amount: u64, nonce: u64)**: bounty (W, init), sponsor (S, W, pays), system_program.
Same `skill_id` and `skill_hash` rules. `amount` must be at least the rent-exempt minimum of an empty account (890,880 lamports today), because a payout to a wallet that holds nothing yet is only accepted if it leaves that wallet rent-exempt. The program transfers `amount` from the sponsor into the PDA. `(sponsor, skill_hash, nonce)` can be used once.

**cancel_bounty()**: bounty (W), sponsor (S, W).
Seeds are checked from the bounty's own fields, then `has_one = sponsor` (a stranger gets `NotSponsor`), then `claimed_by` must be empty. Closes the bounty to the sponsor.

## Events

- `CredentialIssued { learner: Pubkey, skill_id: String, replay_hash: [u8;32], score: u16 }`
- `BountyPaid { bounty: Pubkey, learner: Pubkey, amount: u64 }`

They are logged with `sol_log_data` (`Program data: <base64>` lines). Anchor's `EventParser` decodes them, and so does `parseEvents` in `src/lib/solana/passport.ts`.

## Errors

| Code | Name | Message |
|---|---|---|
| 6000 | NotUpgradeAuthority | Only the program's upgrade authority can initialize the config |
| 6001 | NotAdmin | Only the config admin can do this |
| 6002 | NotIssuer | Only the configured issuer can issue credentials |
| 6003 | NotSponsor | Only the bounty's sponsor can cancel it |
| 6004 | SkillIdLength | skill_id must be 1 to 64 bytes |
| 6005 | SkillIdCharset | skill_id must be printable ASCII without spaces |
| 6006 | SkillHashMismatch | skill_hash must be sha256 of skill_id |
| 6007 | LearnerNotWallet | The learner must be a wallet (an account owned by the System Program) |
| 6008 | BountyTooSmall | A bounty must hold at least the rent-exempt minimum of an empty account |
| 6009 | BountyNotWritable | Bounty accounts must be passed as writable |
| 6010 | BountySkillMismatch | The bounty is for a different skill |
| 6011 | BountyLearnerMismatch | The bounty is reserved for a different learner |
| 6012 | BountyAlreadyClaimed | The bounty has already been claimed |

Anchor's own errors also show up: `AccountNotSigner` (3010), `ConstraintSeeds` (2006), `AccountDiscriminatorMismatch` (3002), `AccountOwnedByWrongProgram` (3007), `AccountNotProgramData` (3013).

## Notes for clients (hx:solana-app)

- **Already issued.** Check whether the credential PDA exists before sending and answer 409. If a race gets there first, the transaction fails in the System Program with "already in use".
- **Bounty races.** Two passes at the same moment can both list the same open bounty. The second transaction then fails with `BountyAlreadyClaimed` (6012) and issues nothing. Re-read the open bounties and send again.
- **How many bounties fit.** Measured on a local validator: 18,024 compute units with no bounty, 53,451 with ten (about 3,500 each). The default 200,000-unit budget fits about 20; the 1,232-byte transaction limit fits about 23 with a 64-byte skill id. Ten in one transaction are covered by the tests; send at most ten.
- **Bounty amounts** below 890,880 lamports are refused (`BountyTooSmall`); show that minimum in the form.
- **Anchor TS clients:** the 0.31 account resolver fills an unset signer account (here `issuer`) with the provider's wallet before it reads `has_one` relations. Pass `issuer` explicitly with `accountsPartial`, or use a provider whose wallet is the issuer.
- The IDL and its TypeScript type are exported to `src/lib/solana/idl/iynk_passport.json` and `.ts` after every build (`node scripts/export-idl.mjs`, which `npm test` and `npm run build` run).

## Build, test and redeploy

Toolchain, pinned in `solana/Anchor.toml` `[toolchain]`: anchor-cli 0.31.1, Solana CLI 4.2.2 (Agave), Rust 1.91.1 for the IDL build, platform-tools v1.54 (picked by cargo-build-sbf 4.2.2). The program depends on `anchor-lang = "=0.31.1"` and `solana-sdk-ids = "=2.2.1"`. The release profile uses `opt-level = "z"` with fat LTO; the binary is 286 KB.

```sh
cd solana
npm install                 # once: @coral-xyz/anchor 0.31.1 and @solana/web3.js 1.99.0 for the tests and scripts
npm run build               # anchor build, then export the IDL and types into src/lib/solana/idl
npm test                    # anchor test --provider.cluster localnet (builds, starts a validator, runs tests/)
npm run deploy:devnet       # deploy or upgrade, then publish or upgrade the on-chain IDL
npm run setup:devnet        # initialize if needed; add --fund-issuer <SOL> and/or --smoke
```

- `Anchor.toml` points the provider at devnet, so **never run a bare `anchor test`**: it would deploy to devnet. `npm test` overrides the cluster, and the suite refuses to run against anything but localhost.
- The local validator listens on 127.0.0.1:43711 (faucet 43714, gossip 43716, dynamic ports 43720-43850). `[test] upgradeable = true` loads the program with the provider wallet as upgrade authority, which `initialize` requires. A second copy at `4pmj4wWv8sYtMht4bwXG9YVCyRDxQy7om4FkksE68bDR` is loaded so the suite can show that `initialize` rejects another program's ProgramData.
- Tests are TypeScript run by Node's built-in test runner (`node --test`, type stripping). They import only Node built-ins and Anchor, so the repo's root `tsc` and ESLint check them without the `solana/node_modules` install.
- **Costs.** The program data account holds about 1.994 SOL of rent. Deploys write the binary into a buffer first (`~/.config/solana/iynk/deploy-buffer.json`, so a failed deploy can resume). On the first deploy the loader moves the buffer's lamports into the program data account, so that rent is paid once. An upgrade writes a fresh buffer while the old program data stays funded, so the deployer needs about 2 SOL more until the loader closes the buffer and refunds it. The deploy script checks the balance first and says how much is missing.
- **SBPF version.** The binary is SBPF v0, the default of cargo-build-sbf 4.2.2. Devnet still accepts v0 deployments: `SIMD-0500: Disable deployment of SBPF v0, v1 and v2 programs` (`B8JJXCy5amZyWG9r7EnUYLwzXSXTxG7GZ1qZ1qggo83g`) was inactive on devnet at 14:12 CDT. A plain `solana-test-validator` activates every feature, so it refuses v0 deploys; rehearse with `--clone-feature-set --url devnet`. If SIMD-0500 activates on devnet, the deployed program keeps running, but upgrades need `cargo build-sbf --arch v3` and a new test pass.
- `cargo build-sbf` prints "overflows the maximum allowed frame space" for `crypto_common` serializers. Those functions come from a dependency and are never called by the program. The one remaining compiler warning (`AccountInfo::realloc` is deprecated) comes from code Anchor 0.31.1's `#[program]` macro generates for its IDL instructions.

## Keys

All keys live outside the repository in `~/.config/solana/iynk/` (directory mode 700, files mode 600) and are never printed or committed:

| File | Public key | Role |
|---|---|---|
| deployer.json | `3sU7fwSukdG77nH2HciyXQ7Vsao1ZCdERXc73TmP9PZb` | upgrade authority, config admin, IDL authority, Anchor provider wallet |
| issuer.json | `7GbNpdhX6yNqcGXSNXJxYU3aidoyrToNDsUoEe5845XR` | `config.issuer`; also `SOLANA_ISSUER_KEYPAIR` in `.env.local` (server fee payer and faucet treasury) |
| iynk_passport-keypair.json | `BYFLDTLNi946Z8jT4JnxgE8Cpzkr9ud7tSrnThFTv31w` | program address; only needed for the first deploy. `solana/target/deploy/iynk_passport-keypair.json` is a symlink to it so Anchor finds it |
| deploy-buffer.json | created on first deploy | buffer address for deploys and upgrades |

`.env.local` has `NEXT_PUBLIC_SOLANA_PROGRAM_ID`, `SOLANA_ISSUER_KEYPAIR` and `NEXT_PUBLIC_SOLANA_CLUSTER=devnet`. To rotate the issuer: generate a key, run `set_issuer` with the deployer, update `SOLANA_ISSUER_KEYPAIR`.

## Sources (read 2026-10-24)

- Anchor.toml reference: https://www.anchor-lang.com/docs/references/anchor-toml (it documents Anchor 1.x; checked against the 0.31.1 source below)
- Anchor 0.31.0 release notes: https://www.anchor-lang.com/docs/updates/release-notes/0-31-0 (toolchain overrides install a different Solana version when `solana_version` differs, so it is pinned to the installed 4.2.2; TS `Program<T>` typing; `accountsPartial`)
- Anchor 0.31.1 CLI source: https://raw.githubusercontent.com/solana-foundation/anchor/v0.31.1/cli/src/lib.rs and `cli/src/config.rs` (toolchain override and restore, `[test.validator]` keys, `[test] upgradeable` and `[[test.genesis]]`)
- anchor-lang 0.31.1 crate source: constraint order (seeds before `has_one`), `Lamports::add_lamports`/`sub_lamports`, `Account::exit`, `ProgramData`, no duplicate-mutable-account check outside `realloc`
- Solana CLI 4.2.2: `solana program deploy --help`, `solana-test-validator --help`, and `solana feature status --url devnet` for SIMD-0500

Third-party code: Anchor (`anchor-lang`, `@coral-xyz/anchor`, Apache-2.0), `@solana/web3.js` (MIT) and `solana-sdk-ids` (Apache-2.0). The program, tests and scripts are our own.

## Changelog (H6, additive only)

- 14:05 hx:solana-program: `initialize` also takes `program_data` (this program's ProgramData, resolved automatically by Anchor clients) and requires the signer to be the program's upgrade authority (6000 `NotUpgradeAuthority`).
- 14:05 hx:solana-program: input rules the contract left open. `skill_id` is 1 to 64 bytes of printable ASCII without spaces, `skill_hash` must equal `sha256(skill_id)` (checked in `create_bounty` and `issue_credential`), the learner must be a System-owned account, bounty accounts must be writable, and a bounty's `amount` must be at least the rent-exempt minimum of an empty account. `learner` is writable in `issue_credential`, since payouts credit it.
- 14:05 hx:solana-program: custom errors 6000-6012 (table above) and the IDL constants `CONFIG_SEED`, `CREDENTIAL_SEED`, `BOUNTY_SEED`.
- 14:10 hx:solana-program: account order for `create_bounty` (bounty, sponsor, system_program) and `cancel_bounty` (bounty, sponsor), matching `src/lib/solana/passport.ts`. H6 did not fix an order; this records the one in the IDL.
