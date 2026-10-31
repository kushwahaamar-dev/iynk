# Council memo: security, privacy and compliance

Seat: security architect and privacy/compliance reviewer (student data, minors, international regulations).
Date: 2026-10-27. Not legal advice. Every legal reading below needs a lawyer who works in education privacy before iynk markets to schools or to children.

Labels: VERIFIED (audit or I read or ran it), DOCUMENTED (a project doc says so), EXTERNAL (research file and its [S#]), ESTIMATED (assumptions shown), HYPOTHESIS (test named), UNKNOWN.

## 1. Bottom line

1. The simulator is not the compliance problem. The social, AI and tracking layer around it is. The lab runs in the browser and collects nothing by itself. Telemetry, rooms, chat, voice, Build Buddies, stories, leaderboard names, AI calls and wallets are what create legal duty and child-safety risk. The cheapest safe product is a lab that works with zero data collection, with the networked features behind a line.
2. The current build must not be relaunched as is, even for adults. VERIFIED: 23 of 23 API routes have no authentication, paid third-party calls are reachable by anyone, any room member can take over the host (R4, reproduced), 500 junk rooms from one IP block all real users (R3, reproduced), and `GET /api/buddies` lists strangers' free-text profiles to the public (D1). [SECURITY_BASELINE.md]
3. Pick the audience in writing before anything else. My recommendation:
   - Relaunch (a): general audience, terms say 13+, networked features off until the fixes below ship.
   - Schools (b): only through a teacher-led mode with no student personal data (class code, pseudonyms, no AI, no chat, no telemetry), then add accounts and a DPA after a paid pilot asks for them.
   - Under-13 (c): no direct-to-child service in the planning horizon. Serve under-13 only inside the "no data" mode, through a school or parent.
4. One legal-provenance issue is a blocker for any commercial step and needs founder action, not engineering: the repo has no licence, the About page says iynk reuses the three original sites' "facts, formulas, timings and lessons", and 342 golden rows plus per-craft constants come from the Drone Engineer site with no permission on file. See section 5, question 19.
5. Rough cost of the minimum programme (ESTIMATED, section 8): relaunch for adults 4 to 7 engineer-weeks plus USD 4,500 to 15,000 of legal time. Adding schools adds roughly 10 to 18 engineer-weeks plus USD 11,000 to 45,000 of legal and audit fees. Direct under-13 service (Route B) adds 6 to 10 engineer-weeks and USD 6,000 to 20,000, and I advise against it now.

## 2. Evidence reviewed (files)

Read in full:
- /Users/amar/Codes/ak/simlab/docs/MASTER_PLAN/01_AUDIT/SECURITY_BASELINE.md (371 lines, all sections, review log and gap fixes)
- /Users/amar/Codes/ak/simlab/docs/MASTER_PLAN/02_RESEARCH/tech/compliance-safety.md (363 lines, including the fact-check log)

Read in part, for provenance and licence (grep plus the lines around each hit):
- /Users/amar/Codes/ak/simlab/docs/MASTER_PLAN/01_AUDIT/REPOSITORY_INVENTORY.md (lines 373, 423, 552, 648 to 666, 840)
- /Users/amar/Codes/ak/simlab/docs/MASTER_PLAN/01_AUDIT/TECHNICAL_DEBT.md (B2-11, B3-04, B11-01)
- /Users/amar/Codes/ak/simlab/docs/MASTER_PLAN/01_AUDIT/inventory/docs-claims-history.md (lines 17, 18, 54 to 57, 134, 157, 158, 190)
- /Users/amar/Codes/ak/simlab/docs/MASTER_PLAN/01_AUDIT/inventory/drone-calc-lab.md (lines 98 to 148, 156)
- /Users/amar/Codes/ak/simlab/docs/MASTER_PLAN/01_AUDIT/inventory/figure-engine.md (lines 18, 19, 85, 170)
- /Users/amar/Codes/ak/simlab/docs/MASTER_PLAN/01_AUDIT/inventory/figure-items.md (line 89), server-data.md (line 119 to 121), ai-search-mcp.md (state section)
- /Users/amar/Codes/ak/simlab/docs/MASTER_PLAN/02_RESEARCH/USER_SEGMENTS.md and COMPETITOR_MATRIX.md (price and no-account facts only)
- /Users/amar/Codes/ak/simlab/docs/MASTER_PLAN/BRIEF.md (mission, lines 27 and 79)
- /Users/amar/Codes/ak/simlab/docs/SPEC.md (the verbatim hackathon brief, lines 1 to 30, 155), docs/research/coverage-checklist-a.md and -b.md (licence and credit rules), docs/handoff/CONTEXT.md (greps for users, kids, schools, location; no founder statement about minors or schools found)

Checked by me directly in the repo today:
- `figures/vendor/colorfigures/LICENSE` is MIT with three copyright lines (April Zhu twice, Tolga Cohce). VERIFIED.
- `public/figures/boards/uno-r3.html` contains one pointer to the licence ("see LICENSE in this folder") and `find public -iname "LICENSE*"` returns nothing. So the deployed figure pages carry no MIT notice text. VERIFIED.
- `figures/vendor/colorfigures/` holds LICENSE, PATCHES.md, build.py, core.js, vendor.py and no VERSION file, although the plan in docs/research/colorfigures-guide.md:652 called for one with a date and sha256. VERIFIED.
- `core.js:383,448` renders a "Made with Colorfigures" footer unless `credit:false`. The About copy credits Colorfigures (`shell.json:32,136,158`). VERIFIED.

Not reviewed: Meta Muse Spark API terms (UNKNOWN, never retrieved), SOPIPA and other state student-privacy law text (403/404 in the research pass), production configuration on Vercel, Vultr and Timescale, the Web Serial hardware twin, the 849 fact-sheet source URLs (3 sampled by the audit). I used no new web sources.

## 3. Weaknesses (each with evidence and label)

### 3.1 Release blockers by tier

Legend: A = public relaunch for adults, S = marketing to schools, U = any under-13 use. "Blocks" lists the tiers the item stops.

| # | Weakness | Evidence | Label | Blocks |
|---|---|---|---|---|
| 1 | No identity anywhere. Paid calls (Meta, Gemini, SerpApi) and the Solana issuer wallet are open to the internet. Limits are in-memory per instance, keyed by a spoofable IP header, so they reset on deploy and multiply with instances. A message can trigger four model rounds yet counts as one call. | SECURITY_BASELINE C1 to C7, M1; server-side counter reproduced as per-process (C3) | VERIFIED | A, S, U |
| 2 | Room takeover: a second `join` with an existing peer id replaces that member and inherits host. Bans are by client-chosen id, so they are useless. | R4 reproduced 2026-10-27 (host replaced, attacker kicked the guest); R5 | VERIFIED | A (for rooms), S, U |
| 3 | Room-creation exhaustion: 520 sequential joins from one process fill the 500-room cap; a real user then gets `server_full` for 30 minutes. | R3 reproduced | VERIFIED | A (rooms), S, U |
| 4 | No report, block, mute, or moderation on chat. Chat `kind` is client-chosen, so anyone can post a line that renders as "AI" or "system". 60 chat lines per second per member. | R5, R7, R8; `grep` for report/mute/moderat in `src/components/realtime` finds none | VERIFIED | S, U; A for any room with strangers |
| 5 | Build Buddies: unauthenticated `GET /api/buddies` returns the newest 50 live profiles (name, language, interests, 280-char `wants`) to anyone. No field for location exists today, but free text carries phone numbers, handles or places. No report, no age check. | D1; server-data.md:119 | VERIFIED | A, S, U |
| 6 | Telemetry is on by default, carries the room code and a persistent random id, has no consent step and no privacy page. A hash of the IP goes to the model provider as a user id. | D3; storage.ts:38; server-data.md:120 | VERIFIED code; law EXTERNAL [S1][S4][S13][S15] | A (privacy page), S, U |
| 7 | No terms, no privacy policy, no age statement, no consent record, no parent or teacher role. The only privacy text is `shell.json:31,138`. | SECURITY_BASELINE section 7 | VERIFIED | A, S, U |
| 8 | AI has no moderation of its own. Safety rests on the upstream providers. The image route is a general text-to-image endpoint. `ask_peer` writes model text into a room with no confirmation, and search page text reaches the model unfenced, so a web page can steer what a child reads. | A1 to A6 | VERIFIED | A (image, ask_peer), S, U |
| 9 | Provider terms may bar minors. Gemini API terms: 18+ and no clients "likely to be accessed by" under-18s [S26]. Gemini is the partner's fallback. Meta Muse Spark terms never read. | compliance-safety.md section 2 | EXTERNAL; conclusion HYPOTHESIS until Google or counsel confirms | S, U |
| 10 | Voice: child audio goes to Meta with no consent text and no age gate. Not stored by iynk. | A7 | VERIFIED | S, U |
| 11 | Credentials are forgeable and unowned. A 7-event hand-written log passes with score 100; any wallet can be named as learner; one hot key is issuer, fee payer and faucet; the secret key sits in `localStorage`. Devnet only today. | S1 reproduced via `replayDroneSafety`; S2, S3, S5 | VERIFIED | Blocks calling it "Proof of Build" in school marketing; mainnet is a blocker for all |
| 12 | Leaderboard accepts a `name` from any caller and any self-reported lap time above 1 s. | D2 | VERIFIED | A (public names), S, U |
| 13 | No page-level CSP, `Permissions-Policy`, `Referrer-Policy`, or `frame-ancestors`; figures run same-origin with no iframe `sandbox`. Safe only while every figure is first-party. | X3, X4 | VERIFIED | A (cheap), S |
| 14 | Accessibility not audited. Drag-only interactions conflict with WCAG 2.2 criterion 2.5.7. Public schools must meet WCAG 2.1 AA by 26 April 2027 (50,000+ population) or 2028 (smaller), so they will ask for an ACR. | compliance-safety.md section 3 | EXTERNAL [S27][S29]; iynk status UNKNOWN (not audited) | S |
| 15 | Licence and provenance (question 19). | section 5 | VERIFIED facts; legal effect UNKNOWN | Any commercial step; A if promoted |
| 16 | Bus factor on secrets: wallet, keypair, `.env.local`, transcripts live on one Mac; an ElevenLabs key was pasted in chat and rotation is not recorded. | docs-claims-history.md (bus factor) | DOCUMENTED | S (security questionnaire) |

### 3.2 Weaknesses in the existing compliance research (so the council does not over-trust it)

- COPPA and the school exception: the FTC did not finalize the school authorisation exception and FAQ section N (schools) was not read [S1][S6]. So "a school can consent for its students" is not something to rely on. UNKNOWN.
- No sourced COPPA penalty figure, no SOPIPA text, no Meta terms, no safe-harbor fees, no SOC 2 price. All cost numbers in the research file are ESTIMATED and the lawyer rate (USD 300 to 500 per hour) is an assumption without a source.
- The research file says the COPPA question turns on whether iynk is "directed to children". iynk's own pitch (a free hand-inked lab with a 6-language UI, drone and robot toys) and a school push would make a regulator's answer likely "yes, or mixed audience". HYPOTHESIS; test: ask counsel after the audience decision.

## 4. Opportunities

- No-account design is a strength. The competitor table calls no-account entry table stakes in K-12 (COMPETITOR_MATRIX.md, "No account to start": Wokwi, Falstad, MakeCode, micro:bit classroom). A lab that collects nothing is easier to approve for a classroom than any tool that needs student emails. DOCUMENTED.
- Teacher-led mode without student PII: a class code and pseudonyms from a fixed word list, progress held in the browser, teacher sees a link-shared summary the student chooses to export. HYPOTHESIS that this meets enough of the real classroom need for a first pilot; test in section 9.
- The relay is small and replaceable. Server-issued peer ids, roles, bans and room secrets are a contained rewrite (SECURITY_BASELINE quick wins 4 and 5 are small). Safe rooms become a selling point once fixed.
- Compliance as a differentiator in schools: a published subprocessor list, a retention policy and a one-page security overview cost days and answer most district questionnaires before a district asks (HYPOTHESIS about procurement behaviour; test: ask three teachers or IT contacts what they require).
- Everything the research flagged as high-risk for EU AI Act purposes is avoidable by design: no grading, placement, proctoring or emotion inference [S19][S21]. A learning-only AI partner stays outside Annex III (conclusion HYPOTHESIS).
- Free hosting posture helps privacy: no ads, no analytics vendors, no CDN fonts (P2: only a first-party boot script). VERIFIED.

## 5. Answers to the red-team questions in my remit

### Question 19: legal or licensing risks in imported component data, figure art, fact sheets, the Colorfigures licence, competitor-derived lesson structure

Short answer: the Colorfigures licence is fine and fixable in an afternoon. The competitor-derived content is the real exposure, because it was a deliberate copy of three live sites with no licence on file, and it is described in public. I am not a lawyer; the severity column is my triage, not an opinion on the law.

| Item | What is there | Risk | Severity | Label | Cheapest fix or test |
|---|---|---|---|---|---|
| Colorfigures engine licence | MIT, copyright April Zhu and Tolga Cohce; commercial use, modification and sublicensing allowed if the notice is kept. About page credits it. | The MIT text requires the notice in "all copies or substantial portions". Built pages carry only a pointer ("see LICENSE in this folder") and `public/` has no LICENSE file. The core is inlined into 80 pages. | low, easy to cure | VERIFIED (pointer present, no notice text) | Put the full three-line copyright and permission text in the core header of every built page and ship `/figures/LICENSE`. One build-script change plus a test. |
| Colorfigures provenance | `vendor.py:15` copies from `~/.claude/skills/colorfigures` on one laptop; no VERSION or hash file; upstream is a downloadable "skill" (tar.gz) not a versioned package. Patches are string replacements. | Cannot show which upstream version the licence covered; single upstream author; if upstream changes terms later, iynk holds a fork with no recorded date. | medium (continuity), low (legal) | VERIFIED | Record the upstream date and sha256 in a VERSION file now; mirror the exact tarball in the repo; email the author for a written confirmation that commercial use and a hosted product are intended. |
| Colorfigures "template, examples" | The first copyright line covers "colour, hand-drawn style, 3D props, template, examples". | If any iynk figure started from an upstream example prop or template, those are covered by the same MIT line, so this is fine, but it is not recorded which ones. | low | UNKNOWN | Diff the 80 figure sources against upstream examples; record the result in a PROVENANCE file. |
| Figure art (80 pages) | Drawn by agents with the engine; 38 item + 12 module + 29 part + 1 flight range (docs-claims-history). Board and part pictures depict real products. | (1) Who owns agent-generated art is a legal question I did not research. (2) Compositions of boards, benches and drones that match the three originals may be copies in the originals' style, since the About page says the originals are drawn with the same engine. (3) Product names and shapes of Arduino, Raspberry Pi, micro:bit, ESP32, Nucleo, Basys 3 involve trademark policies I did not read. | medium | (1) UNKNOWN, (2) HYPOTHESIS, (3) UNKNOWN | (1) one lawyer question; (2) side-by-side review of each figure against the original site and a log of anything copied; (3) read the brand and logo policy page of each of about 10 vendors and keep to nominative use (name for identification, no logos, no "official" wording). |
| Fact sheets (`docs/facts/`, 35 files, 17,823 lines) | Prose built from datasheets, retailer pages and some design files; 849 URL lines; 3 of 849 sampled by the audit; the checker is the same kind of agent as the writer; 7 sheets' adversarial check "never started". The repo is public with no licence. | Facts (voltages, pinouts, timings) are generally not protected by copyright; expression and tables copied word for word, and datasheet figures, are. Retailer listings were used as sources. Also an accuracy risk: users build real hardware from these numbers. | low to medium legal; medium safety | HYPOTHESIS (legal), VERIFIED (sampling limits) | Run an automated overlap scan: for each sheet, find any run of 12 or more consecutive words that also appears in its cited source; rewrite or quote-and-cite hits; delete any retailer-sourced table. A day of work. |
| Hardware design and firmware files | docs-claims-history lists Eagle/Altium files and firmware source among the hardware-derived inputs. | If any code or design data was copied from open-hardware or GPL/LGPL projects, their licence terms attach (attribution, share-alike). The interpreters are described as hand-written parsers and tree walkers (SECURITY_BASELINE X1), which points to no copied code. | unknown | HYPOTHESIS | Search `src/` and `figures/` for long identical runs against Arduino core, MicroPython and Firmata sources; list every third-party file used in `docs/facts` with its licence. |
| Component catalogue and constants (drone lab) | Per-craft constants (`k`, `gPerW`, `flyFactor`, `minTW`) and catalogues copied from drone-engineer.vercel.app into `models.ts` and 13 `src/content/drones/*.ts` files (shipped). 342 golden rows (108 + 234) are the site's printed outputs, used as test oracles. | Ideas and formulas are not protected in the US, but the shipped data tables, the site's terms of use and (for EU users) database rights may apply. Who owns that site is UNKNOWN. The About page says in public that iynk reuses their facts, formulas and timings. A rights holder can read it. | high (legal), plus a correctness issue: the numbers match the site, not hardware | VERIFIED (provenance), legal effect UNKNOWN | Replace constants with measured motor and propeller data that carries a source and licence per row (drone-calc-lab.md recommendation 1 and 8); keep the 342 rows out of the shipped bundle and out of the public repo, or get permission. |
| Competitor-derived lesson structure | SPEC.md (the hackathon brief, verbatim) tells the builder to "reverse-engineer every interaction, visual style, lesson structure, calculation, failure mode" of Learn Arduino, Robotics Engineer and Drone Engineer. SPEC.md:155 says "Do not copy their source files, their author watermarks or their credits." docs/research/*.md holds the reverse-engineering notes in the public repo. | Lesson order and the idea of a lesson are not protected; wording, teaching messages and distinctive selection and arrangement can be. The hackathon brief supports good faith but it is not a licence from the sites' owners, and a hackathon permission would not obviously extend to a commercial product. | high | DOCUMENTED (instruction and About copy), legal effect UNKNOWN | (1) Ask the founders who gave them the three URLs and whether the authors or the organisers consented; (2) email the site owners for a written licence or a written release; (3) if no reply, rewrite lesson prose from datasheets, not from the originals, and stop shipping the About sentence claiming reuse of "lessons". |
| No licence on the iynk repo | GitHub `licenseInfo` null, no LICENSE file, repo is PUBLIC. | Default is all rights reserved: nobody, including a school, a co-founder-to-be or an acquirer, has a clear right to use or copy it. Contributors (Jagrati Kumari wrote 16 of 792 commits) have no written assignment. | medium | VERIFIED | Choose licence or keep closed; add contributor assignment or licence-in letters; set the repo private until provenance is settled (founder decision). |
| Hackathon rule and the first commit | Git cannot prove the "11:30 Oct 24 to 11:30 Oct 25" claim; the first commit has 900 files. Pre-event prototype is disclosed in the write-up. | Not a copyright problem. A prize or sponsor rule problem, and the HackTX rule is the founders' stated constraint. | medium (reputation) | VERIFIED | Out of my lens beyond noting it; keep the PROVENANCE note proposed in docs-claims-history. |
| Search and price data | `price_parts` and datasheet search use SerpApi and pull page text (up to 2 pages of 3,000 characters) into the model; results show shop names and prices. | Third-party site terms and SerpApi's own terms for caching and redisplay; price per search UNKNOWN. | low to medium | UNKNOWN | Read SerpApi terms for caching and redistribution; show links, not copied page text, in the UI. |

Order of attack for question 19: (1) founder answers who the three sites belong to and what was agreed; (2) licence request emails; (3) the MIT notice fix and VERSION file; (4) the overlap scan on fact sheets; (5) replace drone constants. Steps 1 and 3 cost almost nothing.

## 6. What to build first (from my lens, with the reason)

Order matters. Each step makes the next cheaper.

1. Turn off the dangerous public surfaces now (hours, not weeks). Reason: they are high severity and need no design. Disable `GET /api/buddies` listing, set `telemetry` default to off and stop stamping room codes (D3), drop `name` from the lap payload (D2), cut the paid MCP and REST tools from anonymous callers (M1, C4), add the global headers and `Permissions-Policy` (X4), set `poweredByHeader: false`, fix the "never stored" copy (D4), apply the other quick wins in SECURITY_BASELINE section 10 that are one-line.
2. Founder decisions in writing: audience (13+ general, no direct under-13), the question 19 answers, and whether the repo stays public. Reason: every other compliance step depends on them.
3. Shared state store and real spend caps: one Postgres or Upstash table for rate limits, daily and monthly spend counters per provider, faucet grants, and a kill switch. Reason: C1 to C9 all come from per-instance memory. A signed anonymous device token is enough to start; it is not a user account.
4. Relay authority: server-issued peer id plus a resume secret, host and baton enforced by the relay, server-set chat `kind`, per-socket chat bucket, room-creation rate limit and short TTL for unused rooms, room lock or host approval, report and block that write to a log a human reads. Reason: R3 to R8 and the only way rooms can ever be offered to schools.
5. Privacy basics: terms (13+), privacy policy for a child reader, subprocessor list (Meta, Google, SerpApi, Vercel, Tiger Data, Solana RPC host), retention table, data-request email. Reason: cheap, required for any launch, reused by every later tier.
6. Data-free "classroom mode": class code, pseudonym picker, no telemetry, no AI, no chat, no buddies, no wallet, no leaderboard names. Reason: it is the only version of the product that can legally reach under-13 and schools without waiting for consent infrastructure. HYPOTHESIS that teachers value it; test in section 9.
7. AI safety layer before any AI is exposed to a school: input and output moderation (provider endpoint or classifier), fence web text with `quoted()`, confirmation before `ask_peer`, AI labels on every reply, remove Gemini from any surface reachable by minors until the terms are cleared, block the image route for minors. Reason: A1 to A6, Gemini terms [S26], AI Act Art. 50 transparency [S24].
8. WCAG 2.2 AA pass with a non-drag alternative, then a VPAT 2.5 INT. Reason: the ADA Title II dates (26 April 2027 and 2028) make schools ask for it; fixing drag-only interaction is the long pole (3 to 6 engineer-weeks, ESTIMATED in the research file).
9. Licence hygiene: MIT notice in built pages, VERSION file, PROVENANCE.md, overlap scan. Reason: cheap, removes the only part of question 19 that is certain.

## 7. What not to build yet (and the trigger that would change that)

| Do not build yet | Why | Trigger to revisit |
|---|---|---|
| Public rooms or any room listing | Strangers plus chat plus children; R1 to R8 open | Relay authority done, report/block staffed by a named person, and 90 days of private-room use without an unresolved safety report |
| Free-text buddy matching, and any buddy location | D1 is a blocker; location is personal information under COPPA and a UK Children's Code standard (off by default) [S1][S15] | A teacher-run or invite-only version; for location only: adult opt-in, coarse region, a DPIA written, counsel sign-off |
| Open chat for under-18s | Needs moderation and a human response path that a small team cannot staff | A moderation provider is in place, a documented response time exists, and a school pilot asks for it by name |
| Voice for minors | Audio to a third party; consent and provider terms unread | Meta terms read and acceptable, consent text approved, a school asks |
| Image generation and stories with peer names for minors | No output moderation; peers' chat enters prompts and returns to the room (A2, D6) | Moderation on output proven on a test set; names and chat stripped from prompts |
| Public leaderboard with free names | D2; faked times | Server-verified laps (server replays a flight log) and pseudonyms from a fixed list |
| Wallets and mainnet credentials for anyone under 18; real-value tokens or bounties for anyone | Persistent public identifier that cannot be erased; credentials forgeable (S1, S2); key custody (S3); crypto rules unresearched [compliance-safety.md section 7] | Server-issued lab sessions, wallet signature on attest, issuer key in KMS, a lawyer opinion (10 to 30 hours, ESTIMATED), and an adult-only opt-in. Until then call them practice badges, not proof |
| Emotion detection, grading, placement or proctoring | AI Act Art. 5(1)(f) bans emotion inference in education; Annex III makes the others high-risk [S19][S21] | A written Art. 6(3) memo or a funded high-risk plan; never emotion inference |
| Direct-to-under-13 accounts (COPPA Route B) | 6 to 10 engineer-weeks plus consent verification fees (UNKNOWN); every other feature then carries child duties, and India treats under-18 as children [S16][S17] | Paid school contracts large enough to fund it, and a written audience decision that includes under-13 |
| SOC 2, Clever, ClassLink, LTI 1.3 | 3 to 8 weeks each, fees UNKNOWN; none is a legal blocker | A district names one in writing during procurement (HYPOTHESIS about timing) |
| Weapon-like drone features (payload release, target tracking, long-range navigation, swarming with encrypted links) | Export-control and misuse risk grows; beginner flight content is "published" and outside the EAR under 15 CFR 734.7 [S45], but the ITAR and EAR carve-outs were not researched in depth [S46] | A counsel consult (2 to 4 hours, ESTIMATED) before any such feature |

## 8. Minimum compliance programme and its cost

Assumptions, because the research file gave none sourced: one founder-engineer; a part-time education-privacy lawyer at USD 300 to 500 per hour (assumed, not sourced); engineer-weeks at full time. Everything in the table is ESTIMATED. Replace with quotes before budgeting.

### 8.1 What the programme contains

| Layer | Contents | Tier |
|---|---|---|
| Decisions and papers | Audience statement (13+), terms, privacy policy, retention table, subprocessor list, data-request process, incident and breach plan (named person, one page), licence/provenance file | A |
| Technical floor | Items 1 to 5 and 9 of section 6, plus shared limiter and kill switch | A |
| Safety layer | Relay authority, report and block, AI moderation, AI labels, Gemini decision | A for rooms and AI, S |
| Data-free classroom mode | Section 6 item 6 | S, U |
| School papers | NDPA v2.2 as the default DPA (school-official terms: direct control, no redisclosure, no training on student data, deletion on request) [S8][S9][S12], written information-security programme and coordinator (the 2025 COPPA rule requires both for operators it covers) [S5], DPIA for UK and EU, security overview page, VPAT | S |
| Accounts and parent flow (only if direct under-13 or student accounts) | Verifiable parental consent, parent dashboard to review and delete, retention enforcement, deletion on request | U (Route B), S if accounts |
| Accessibility | WCAG 2.2 AA pass and ACR | S |

### 8.2 Cost

| Tier | Engineer-weeks | Lawyer and audit | Other | Source of the numbers |
|---|---|---|---|---|
| A: adult relaunch | 4 to 7: quick wins and headers 1, shared limiter and spend caps 1 to 2, relay authority 2 to 3, privacy basics and copy 0.5 to 1 | 15 to 30 lawyer hours, USD 4,500 to 15,000 (terms, privacy policy, provenance question, one advice call on the audience) | Moderation API fees UNKNOWN | Engineer-weeks: my estimate from the SECURITY_BASELINE quick-win list and compliance-safety.md Route A (1 to 2 weeks). Lawyer: 15 to 30 hours at the assumed rate. |
| S: schools, no student accounts (classroom mode) | add 10 to 18: classroom mode 2 to 4, AI safety layer 2 to 3, WCAG 3 to 6, security programme and DPIA docs 2 to 3, DPA and subprocessors 1 | add 40 to 80 lawyer hours, USD 12,000 to 40,000 (DPA, GDPR/UK review, DPIA, state laws, SOPIPA) plus a third-party accessibility audit USD 5,000 to 25,000 (research file ESTIMATED, no source) | Pen-test price UNKNOWN; cyber-insurance price UNKNOWN; SDPC membership UNKNOWN | compliance-safety.md sections 1.2 to 1.4 and 3 for items; hours are my sum of its ranges. |
| U: direct under-13 (Route B) | add 6 to 10 | add 20 to 40 lawyer hours, USD 6,000 to 20,000 | Consent verification provider or card micro-charge fee UNKNOWN; India, Brazil notices add about 1.5 to 2 weeks | compliance-safety.md section 1.1 |

Ongoing (all UNKNOWN until quoted): moderation time per week for any live chat or report queue, annual risk assessment and DPIA refresh, accessibility re-test per release, provider spend. The programme needs one named owner; with a two-person team that is a founder, which is itself a cost.

Rough totals (ESTIMATED): A about USD 4,500 to 15,000; A + S about USD 21,500 to 85,000 including the optional accessibility audit; A + S + U adds USD 6,000 to 20,000. These cover advice and audits, not engineer salaries or any consent-verification fees.

## 9. Risks

| Risk | Why it matters | Mitigation |
|---|---|---|
| A public relaunch with the current relay and buddy pool; a first real incident involving a minor | The feature set invites it; no report path exists; the repo is public so the weaknesses are readable | Do section 6 item 1 and 4 before any announcement; keep rooms off until then |
| Cost abuse drains AI and search credits and takes the lab partner offline for everyone | C1 to C6; per-instance limiter; no spend alert | Shared counters, daily caps, kill switch, alerting |
| Provider terms forbid the use case | Gemini 18+ [S26]; Meta terms unread; Meta Muse Spark pricing source says "public preview, US developers" (TECHNICAL_RESEARCH.md) so non-US availability is UNKNOWN | Read Meta terms this week; pick a provider whose terms and DPA allow minors, or run AI as adults-only |
| A rights holder objects to the lesson/constant reuse once iynk is commercial or funded | Public About text, public reverse-engineering notes, no permission on file | Question 19 plan; do not take funding or sign a school contract on content you cannot show you own |
| Regulators treat iynk as child-directed even if the terms say 13+ | Content and marketing are the test, not the terms [S1][S6] | Do not market to under-13; keep the data-free mode; get counsel's view after the audience decision |
| India and EU age lines are higher (18 in India [S16][S17]; 16 in the EU unless lowered, minimum 13 [S13]) | The mission is global; six UI languages | Keep telemetry and chat off by default everywhere, not by country; treat consent-based processing for minors as off |
| False credential claims | "Proof of Build" is forgeable (S1 reproduced); school marketing that implies verified skill could be a misleading claim (HYPOTHESIS; this is my reading, not a ruling) | Call them practice badges until sessions are server-issued |
| Real-world physical harm from lessons | LiPo fires, propeller injuries (26 NEISS child records 2010 to 2019 [S38]), flying rules (49 U.S.C. 44809, Remote ID, EASA categories [S42][S43][S44]); the drone calculator matches a website, not hardware (drone-calc-lab.md) | Safety copy with a second-source citation for LiPo guidance; a "before you fly for real" panel; no mains-voltage builds; replace calculator constants with measured data; a plain disclaimer that outputs are estimates |
| Single-person key custody and secrets | Wallet, keypair, `.env.local`, rotation not recorded | Rotate keys, move to a secrets manager, document custody, back up to a second person |
| Dependency advisories | 15 production advisories (2 high, 13 moderate), all via Solana packages; likely moving `@coral-xyz/anchor` to dev dependencies removes the high ones (HYPOTHESIS, not run) | Run the move and re-audit; this blocks a clean report for a security questionnaire, not a safe launch |
| Over-engineering compliance | A full Route B build before any school asks would burn weeks | Use the triggers in section 7 |

## 10. Open questions and the cheapest way to answer each

| Question | Cheapest way to answer |
|---|---|
| Who owns Learn Arduino, Robotics Engineer and Drone Engineer, and did anyone grant permission beyond the hackathon brief? | Ask the founders today who supplied the three URLs; email the site owners and the hackathon organisers; the reply is the answer. Cost: one hour. |
| Is Colorfigures' commercial use intended, and which upstream version was copied? | Email the author with the tarball hash; add a VERSION file. Cost: one hour. |
| Do the Meta Muse Spark API terms allow apps used by under-18s, and is the API available outside the US? | Read the terms and the developer agreement; ask Meta support in writing. Cost: one to two hours. |
| Does Gemini fallback violate Google's terms for a product schools might use? | Read [S26] again with counsel's first call, or remove Gemini from minor-reachable surfaces. Removal is cheaper than the answer. |
| Which audience will iynk serve: 13+ general or school-first? | Founders decide in writing; test demand with 10 teacher conversations on whether a no-account classroom mode is enough (USER_RESEARCH_PLAN.md owns the interview design). |
| Is a data-free classroom mode enough for a real classroom? | Pilot with 2 to 3 classes; decision criterion: a teacher completes a full lesson without needing student accounts or progress reports. If not, accounts become a paid-pilot feature. |
| Does Vercel's request logging (IP, user agent) count as collection that triggers COPPA for a data-free mode? | Counsel question (HYPOTHESIS: operational logs fall under an internal-operations exception, not verified). Ask in the first legal call. |
| What does the school market actually require before signing (DPA only, VPAT, SOC 2, SSO)? | Ask 3 to 5 school IT contacts or district buyers for their vendor checklist; collect copies of two real questionnaires. |
| What is the real cost of AI abuse and of moderation per month? | Add the spend ledger (section 6 item 3) and read one month of data; get a moderation API price from the provider chosen. |
| Does the production relay allow all origins, and does Vercel overwrite `x-real-ip`? | Read `REALTIME_ALLOWED_ORIGINS` in the Vultr config and send one spoofed-header request against a staging deploy. Cost: half an hour. |
| Is the fact-sheet text copied from sources? | Run the 12-word overlap scan (section 5). Cost: one day. |
| What do the Arduino, Raspberry Pi, micro:bit and other brand policies allow in a commercial product? | Read the vendors' trademark pages and keep a one-page rule list. Cost: half a day. |
| Who owns agent-generated figure art and prose? | One lawyer question; no engineering work until answered. |

---
Files read are listed in section 2. This memo changed no file in the repo except itself.
