#!/bin/bash
cd ~/iynk-master-plan-scratch/spikes/RS-01
P=svg-plain,svg-cull,svg-use,react,canvas
for t in 1 4 6; do echo "== chromium $t"; uptime; node run.mjs chromium $t $P 500 1000 1; done
echo "== webkit 1"; uptime; PLAYWRIGHT_BROWSERS_PATH=$PWD/browsers node run.mjs webkit 1 $P 500 1000 1
echo ALLDONE
