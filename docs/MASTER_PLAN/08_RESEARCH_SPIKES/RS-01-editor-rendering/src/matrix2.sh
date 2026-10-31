#!/bin/bash
cd ~/iynk-master-plan-scratch/spikes/RS-01
P=svg-plain,svg-cull,svg-lod,svg-use,react,canvas
for t in 1 4 6; do echo "== headed chromium $t"; uptime; HEADED=1 node run.mjs chromium $t $P 500 1000 1; done
for t in 1 4 6; do echo "== headless lod $t"; uptime; node run.mjs chromium $t svg-lod 500 1000 1; done
echo ALLDONE2
