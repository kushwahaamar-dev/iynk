// Renders the three lesson reference sketches (default chips) and runs each through iynk's headless interpreter.
// Imports repo code read-only. Writes sketches/<id>/<id>.ino and traces/<id>.interp.json.
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { it, expect } from 'vitest';
import { boardLoaders } from '@/content/index.generated';
import { defaultParams, renderTemplate, resolveText } from '@/lib/boardlab/template';
import { lessonJob, runChecks } from '@/lib/interp';

const REPO = '/Users/amar/Codes/ak/simlab';
const OUT = process.env.RS03_DIR ?? process.cwd();
const ids = ['blink', 'motor', 'knob'];

function prose(id: string): (key: string) => string {
  const file = join(REPO, 'src/i18n/content/en/boards', `${id}.json`);
  const json: unknown = existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : {};
  return (key) => {
    const v = key.split('.').reduce<unknown>((o, k) => (o && typeof o === 'object' ? (o as Record<string, unknown>)[k] : undefined), json);
    return typeof v === 'string' ? v : key;
  };
}

for (const lessonId of ids) {
  it(`interp ${lessonId}`, async () => {
    const board = (await boardLoaders['uno-r3']()).default;
    const lesson = board.lessons.find((l) => l.id === lessonId)!;
    const source = resolveText(renderTemplate(lesson.code.source, lesson.params, defaultParams(lesson.params)).code, prose('uno-r3'));
    mkdirSync(join(OUT, 'sketches', lessonId), { recursive: true });
    writeFileSync(join(OUT, 'sketches', lessonId, `${lessonId}.ino`), source);
    const t0 = performance.now();
    const { trace, results } = runChecks(lessonJob(board, lesson, source));
    const wallMs = performance.now() - t0;
    writeFileSync(join(OUT, 'traces', `${lessonId}.interp.json`), JSON.stringify({ lessonId, runMs: lesson.runMs, world: lesson.world, wallMs, checks: results, trace }, null, 1));
    expect(trace.error).toBeNull();
  });
}
