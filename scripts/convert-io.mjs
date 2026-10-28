// File access for the catalogue converter. src/project/convert is portable and cannot read files, so loading
// the 38 items and their six-language texts happens here.

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const LANGS = ['en', 'de', 'es', 'fr', 'hi', 'zh'];
const LABS = {
  board: { dir: 'boards', ids: 'BOARD_IDS' },
  robotics: { dir: 'robotics', ids: 'ROBOTICS_IDS' },
  drone: { dir: 'drones', ids: 'DRONE_IDS' },
};

const lab = (name, id) => {
  const found = LABS[name];
  if (!found) throw new Error(`${name}/${id}: unknown lab "${name}"`);
  return found;
};

// The content JSON nests keys by section; the converter looks texts up by the dotted key.
function flatten(object, prefix = '', out = {}) {
  for (const [key, value] of Object.entries(object)) {
    if (value && typeof value === 'object') flatten(value, `${prefix}${key}.`, out);
    else out[`${prefix}${key}`] = value;
  }
  return out;
}

export function loadItem(labName, id) {
  lab(labName, id);
  try {
    const out = execFileSync(process.execPath, [join(root, 'scripts', 'gen-content-index.mjs'), '--emit', `${labName}/${id}`], {
      cwd: root,
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    const item = JSON.parse(out);
    if (!item.data) throw new Error('it has no data module');
    return { ...item, en: flatten(item.en) };
  } catch (e) {
    throw new Error(`${labName}/${id}: cannot load the item (${String(e.stderr || e.message).trim().split('\n').pop()})`, { cause: e });
  }
}

export function loadTexts(labName, id) {
  const { dir } = lab(labName, id);
  const texts = {};
  for (const language of LANGS) {
    const file = join(root, 'src', 'i18n', 'content', language, dir, `${id}.json`);
    try {
      texts[language] = flatten(JSON.parse(readFileSync(file, 'utf8')));
    } catch (e) {
      throw new Error(`${labName}/${id}: cannot read the ${language} texts (${e.message})`, { cause: e });
    }
  }
  return texts;
}

export function listItems() {
  const ids = pathToFileURL(join(root, 'src', 'content', 'ids.ts')).href;
  const script = `import(${JSON.stringify(ids)}).then((m) => console.log(JSON.stringify(m)))`;
  const out = execFileSync(process.execPath, ['--input-type=module', '-e', script], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  });
  const exported = JSON.parse(out);
  return Object.entries(LABS).flatMap(([labName, { ids: key }]) => exported[key].map((id) => ({ lab: labName, id })));
}
