#!/bin/bash
# Reproduce RS-03 from scratch. Needs: node 24, curl, python3. Work dir: /Users/amar/iynk-master-plan-scratch/spikes/RS-03
set -e
W=/Users/amar/iynk-master-plan-scratch/spikes/RS-03
SRC="$(cd "$(dirname "$0")" && pwd)"
mkdir -p $W/{dl,tools/cli,src,traces,web,sketches} && cd $W
cp $SRC/*.mjs $SRC/*.ts $SRC/compile-bench.sh src/; rm -f src/vitest.config.mjs
cp $SRC/vitest.config.mjs $SRC/env.sh $SRC/package.json .
cp $SRC/web/* web/
[ -x tools/cli/arduino-cli ] || { curl -sL -o dl/cli.tgz https://github.com/arduino/arduino-cli/releases/download/v1.5.1/arduino-cli_1.5.1_macOS_ARM64.tar.gz; tar xzf dl/cli.tgz -C tools/cli; }
. ./env.sh
arduino-cli core update-index && arduino-cli core install arduino:avr
npm i avr8js@0.21.1 vitest playwright esbuild ws
npx vitest run --config vitest.config.mjs          # sketches/ and traces/*.interp.json
src/compile-bench.sh | tee logs-compile.txt         # out/<id>/<id>.ino.hex
node src/run-avr.mjs                                # traces/*.avr.json
node src/compare.mjs && node src/adapter-30hz.mjs
node src/bench-node.mjs
npx esbuild src/avr-core.mjs --bundle --format=esm --outfile=web/avr-core.bundle.js
SIM_S=10 node src/bench-browser.mjs chromium
