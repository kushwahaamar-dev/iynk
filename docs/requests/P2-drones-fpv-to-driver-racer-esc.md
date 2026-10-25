# P2-drones-fpv to the driver: the racer's default build opens on an ESC over-current warning

Written 2026-10-24 21:10 CDT by P2-drones-fpv. My brief says "default builds that don't open on an over-current
warning (racer)". I can't do it from my files: `src/lib/drone/content.test.ts` pins `racer.design.model` to
`calcModels.racer` and `racer.design.default` to the golden default, and `src/lib/drone/**` (owner "calc" in
`docs/ARCHITECTURE.md` §2) has no wave-A owner. So this asks whoever may edit the calculator fixtures.

## Why

The default racer (4S 1300, 2207 2500 KV, 5x4.8x3) draws 216.7 A flat out in the calculator, 54.2 A per motor, and
the racer model rates its 4-in-1 ESC at `escAmps: 45`, so `designChecks` adds `esc-overcurrent` on first load
(`docs/audit/drones.md` MINOR). Real race 4-in-1 ESCs are 45-55 A per channel (`docs/facts/racer.md` lines 23 and
215), and the calculator's 217 A peak is about 20 % above the real 160-180 A bursts (line 202). A 55 A ESC is the
honest default for this build.

## What (calculator side)

1. `src/lib/drone/__fixtures__/models.ts`, `racer`: `escAmps: 45` becomes `escAmps: 55`. No golden row changes:
   `escAmps` only feeds `designChecks`, not `calc`.
2. `src/lib/drone/calc.test.ts` line 194-196 uses the racer default as its ESC over-current example. Keep the test,
   move it to the racer's 2306 2700 KV motor (63.2 A per motor, still over 55 A) and pin the default as clean:

   ```ts
   const racer = calc(input('racer', '4s1300', '2306-2700', '5x4.8x3'));
   expect(racer.maxA / 4).toBeGreaterThan(55);
   expect(codes('racer', '4s1300', '2306-2700', '5x4.8x3')).toContain('esc-overcurrent');
   expect(codes('racer', '4s1300', '2207-2500', '5x4.8x3')).not.toContain('esc-overcurrent');
   ```

## What (my side, in the same commit, since content.test.ts compares the two)

3. `src/content/drones/racer.ts` line 77: `escAmps: 45` becomes `escAmps: 55`.
4. `src/i18n/content/en/drones/racer.json`: `design.fixed.ESC` and `parts.ESC.name` say "55 A" instead of "45 A";
   `parts.ESC.what` ends "... with the 55 A rating."; `design.verdict.ok` stays (it still explains the warning for
   the 2306 2700 KV pick).
5. `src/content/drones/racer.test.ts`, test "says the ESC warning on the default build ...": expect the default to be
   clean and the 2306 2700 KV pick to warn:

   ```ts
   it('opens on a clean build, and warns on the hotter 2306 2700 KV motor, which a smoother prop clears', () => {
     const at = (pick: Partial<typeof racer.design.default>) =>
       designChecks(designInput(racer.design, { ...racer.design.default, ...pick })).map((c) => c.code);
     expect(at({})).toEqual([]);
     expect(at({ motor: '2306-2700' })).toContain('esc-overcurrent');
     expect(at({ motor: '2306-2700', prop: '5.1x3.6x3' })).not.toContain('esc-overcurrent');
     expect(text(en, 'design.verdict.ok')).toMatch(/headroom/);
   });
   ```

   (2306 2700 KV is 63.2 A per motor on the 5x4.8x3 and 51.7 A on the smooth 5.1x3.6x3.)
6. `figures/drones/racer.js`: the ESC part name and the wiring-sheet node sub (`'45 A x4, AM32'`) say 55 A, the
   header comment too; rebuild with `python3 -I figures/tools/cfbuild.py drones/racer`. `figures/prompts/racer.md`
   line 9 says 55 A.

I will do 3-6 myself if 1-2 land while wave A is still running; otherwise they are listed in
`docs/requests/P2-drones-fpv-gaps.md` for whoever picks the racer up. Reply here.
