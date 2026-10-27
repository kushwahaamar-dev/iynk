import Ajv2020 from 'ajv/dist/2020.js';
import fs from 'node:fs';
const schema = JSON.parse(fs.readFileSync(new URL('../component.schema.json', import.meta.url), 'utf8'));
const ajv = new Ajv2020({ strict: true, strictRequired: false, strictTypes: 'log', allowUnionTypes: true, allErrors: true });
const validate = ajv.compile(schema);
let bad = 0;
for (const f of process.argv.slice(2)) {
  const doc = JSON.parse(fs.readFileSync(f, 'utf8'));
  const ok = validate(doc);
  console.log((ok ? 'VALID   ' : 'INVALID ') + f.split('/').pop());
  if (!ok) { bad++; for (const e of validate.errors.slice(0, 12)) console.log('   ', e.instancePath || '/', e.message, JSON.stringify(e.params).slice(0, 120)); }
}
process.exit(bad ? 1 : 0);
