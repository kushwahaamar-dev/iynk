#!/bin/sh
# Re-runs the whole spike. Needs: Node 24, python3 (the repo's figure builder), the iynk repo checked out at
# /Users/amar/Codes/ak/simlab (read-only), and the scratch folder below with `npm i eecircuit-engine@1.9.0 playwright@1.64.0`.
set -e
S=/Users/amar/iynk-master-plan-scratch/spikes/RS-08
cd $S
mkdir -p src netlists
# the patched copy exposes the solver's raw node voltages: two one-line additions to the repo's bench-solve.js
python3 - <<'PY'
s=open('/Users/amar/Codes/ak/simlab/figures/engine/bench-solve.js').read()
open('bench-solve.orig.js','w').write(s)
a="  return { parts, byId, els, buttons, nets, gnd, roots };"; assert s.count(a)==1
s=s.replace(a,"  return { parts, byId, els, buttons, nets, gnd, roots, R };")
b="  return out;\n};\n\n/* ---------- sound"; assert s.count(b)==1
s=s.replace(b,"  out.raw = { res, nl, els, slices };\n  return out;\n};\n\n/* ---------- sound")
open('bench-solve.patched.js','w').write(s)
PY
ln -sfn /Users/amar/Codes/ak/simlab/node_modules/jsdom node_modules/jsdom
node src/compare.mjs      # 20 circuits, solver vs ngspice, matched and realistic models -> results.json, netlists/
node src/extra.mjs        # 60 random resistor networks, linsolve scaling
node src/scan.mjs         # every lesson circuit in the repo: size and ms per solve (jsdom)
node src/timebrowser.mjs  # ms per solve in Chromium (1x, 4x, 6x CPU throttle) and WebKit
