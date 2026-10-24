# Repo health

Kept by shell-2. One line per failure: file, error, owner (docs/ARCHITECTURE.md §2, docs/hacktx/HX-CONTRACT.md H12).
Commands: `node scripts/gen-content-index.mjs && npx next typegen && npx tsc --noEmit -p .`, `npx eslint . --quiet`,
`npx vitest run`. Work in progress moves fast; a line here means "failing at the time stamped", nothing more.

## 14:18 CDT

ESLint: clean (exit 0).

TypeScript (29 errors, none in shell files):
- src/content/index.generated.ts lines 8-20: board modules uno-r3, nano, esp32-devkitc, nodemcu, pico fail `Loader<BoardContent>` on `default.assembly`; robotics transistor-switch (`current.loads`), esp32-s3-build, tb6612fng, pi5-ros2 (`steps`) fail `Loader<RoboticsContent>`. schema.ts changed 14:16, so this is content vs schema drift. Owners: item content agents for those ids, architect (schema.ts).
- src/content/robotics/esp32-s3-build.ts:395-398: `minMs`, `must`, `match` are not in `Omit<Check, "label">`. Owner: item content agent esp32-s3-build (or architect if Check should gain them).
- src/content/boards/esp32-devkitc.test.ts:170: lesson kind union `"intro" | "protocol" | "project"` not assignable to `"analog" | "io" | "input" | "wireless"`. Owner: item content agent esp32-devkitc.
- src/lib/hw/sim.test.ts:6: `"arduino"` is not assignable to `Language`. Owner: hx:hw.
- src/lib/search/messages.ts:19: dynamic JSON import's Promise type does not match the declared loader type. Owner: hx:search.

Vitest (5 failed of 1162):
- src/i18n/messages/{es,fr,de,zh,hi}/boardlab.json: missing `readout.part.open`, `readout.part.reverse`; 13 keys English no longer has (`assembly.next`, `assembly.todo`, `board.views`, ...). Owner: ui:boardlab.
- src/i18n/messages/{es,fr,de,zh,hi}/dronelab.json: missing `tests.failed`; 5 keys English no longer has (`cli.effects`, `design.sent`, `fly.keys`, ...). Owner: ui:dronelab.
- src/lib/interp/verilog/verilog.test.ts: "a #(.DIV(n)) override on an instance" (expected 32, got 1) and "reports friendly errors with line and column" (col 42 expected). Owner: interpreters.
- src/lib/interp/python/python.test.ts: "friendly errors with line and column" (indent message expected). Owner: interpreters.

Fixed on the shell side: `src/i18n/messages.test.ts` crashed (`matchAll` of undefined) on the boardlab key
`connector.barrel-5.5x2.1`; the same dotted key also made `t()` throw at runtime (split on every dot). `messageAt` in
src/i18n/translate.ts now resolves keys that contain dots, and the test uses it.
