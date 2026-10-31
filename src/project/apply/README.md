# Adding an op

An op is one change to a project document. `apply` turns `(state, op)` into a new state and the op that undoes it.
Only `src/project/session.ts` may import this folder (FA-01); everything else goes through the session.

1. **Schema.** Add the branch to `Op` in `docs/MASTER_PLAN/04_ARCHITECTURE/schemas/project.schema.json`: a `k` constant
   and the fields. Keep ids in the existing prefix patterns.
2. **Generate.** Run `npm run schema:gen`. This rewrites `src/project/generated/types.ts` and `validate.mjs`. Commit them
   with the schema; `npm run schema:check` fails otherwise.
3. **Handler.** Add a `Handler<"your.kind">` to the file that owns the area (`net.ts`, `view.ts`, `wire.ts`,
   `component.ts`, `board.ts`, `doc.ts`, `source.ts`, `sim.ts`, `misc.ts`) and list it in that file's handlers map.
   `index.ts` spreads the maps into `HANDLERS`. A handler:
   - returns `{ state, inverse }` or a `reject(code, message)` with a code from `RejectCode` in `types.ts`;
   - builds the new state without changing the old one, and reuses every sub-object it did not touch, because
     `touched.ts` finds changed entities by reference;
   - returns inverse ops that restore the exact previous state, including the sorted position of a set entry
     (`upsertBy` keeps a set sorted);
   - checks only what this op can break. Cross-document rules do not belong here.
4. **Rule.** If the op makes a new invariant possible, add a `V3-*` rule: a row in `RULES` in `src/project/semantic.ts`
   and its check in `semantic.entity.ts` (one entity) or `semantic.cross.ts` (across entities). Mark `batch: true` when
   `checkBatch` should run it at the end of a batch. `semantic.test.ts` holds the table and the code to each other.
5. **Coverage.** Add the kind to `COVERED` in `apply.coverage.test.ts`, pointing at the test file that exercises it. The
   test fails while the schema and `IMPLEMENTED_KINDS` disagree.
6. **Tests.** In that test file: a normal case, each reject code the handler can return, and an inverse check (apply,
   apply the inverse, compare `stateHash`). Add the kind to the seeded generators in `src/project/testing/generators.ts`
   if random sessions should draw it, so the round-trip and replay tests cover it.
7. **Run.** `npm run typecheck`, `npm run lint`, and `npx vitest run src/project`.
