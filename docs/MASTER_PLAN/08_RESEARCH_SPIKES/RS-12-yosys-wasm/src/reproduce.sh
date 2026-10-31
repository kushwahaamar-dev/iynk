#!/bin/sh
# Run from the scratch dir after: npm init -y && npm i @yowasp/yosys@0.71.188-dev.1267 yosys2digitaljs@0.10.3 digitaljs@0.14.2 esbuild playwright
# and with src/ and fixtures/ copied next to package.json.
set -e
mkdir -p logs out
node src/extract.mjs
: > logs/yosys-results.jsonl
for f in fixtures/*.v; do n=$(basename $f .v)
  /usr/bin/time -l node --experimental-wasm-exnref src/run-yosys.mjs $f out > logs/$n.stdout 2> logs/$n.time
done
for f in fixtures/*.v; do node --experimental-wasm-exnref src/run-yosys-djs.mjs $f out >/dev/null 2>&1; done
node --experimental-wasm-exnref src/run-yosys-djs.mjs fixtures/basys3-counter.v out "CLK_HZ=100000" >/dev/null 2>&1
node --experimental-wasm-exnref src/run-yosys-djs.mjs fixtures/basys3-blink.v out "CLK_HZ=100000" >/dev/null 2>&1
node src/convert.mjs
npx esbuild src/iynk-entry.ts --bundle --platform=node --format=esm --outfile=build/iynk.mjs --alias:@=/path/to/simlab/src
node src/compare.mjs basys3-counter out/basys3-counter-cp.digitaljs.json
PATCH_INIT=1 N=110000 node src/compare.mjs basys3-blink out/basys3-blink-cp.digitaljs.json
# browser: build the page, serve it, measure
cp node_modules/@yowasp/yosys/gen/*.wasm node_modules/@yowasp/yosys/gen/*.tar web/
npx esbuild src/page-entry.js --bundle --format=esm --platform=browser '--external:node:*' --outfile=web/app.js
node src/serve.mjs &   # port 8765
node src/browser.mjs chromium 1 0 basys3-display   # args: engine cpuThrottle mbps lesson
node src/browser.mjs chromium 6 20 basys3-display
node src/browser.mjs webkit 1 0 basys3-display
kill %1
