#!/bin/bash
cd ~/iynk-master-plan-scratch/spikes/RS-01
echo "== webkit lod"; uptime; PLAYWRIGHT_BROWSERS_PATH=$PWD/browsers node run.mjs webkit 1 svg-lod 500 1000 1
for n in 100 250; do echo "== headed sweep $n"; HEADED=1 node run.mjs chromium 1 svg-plain,react,canvas $n $((n*2)) 1 pan-fit,zoom; done
echo "== headed dpr2"; HEADED=1 node run.mjs chromium 1 svg-plain,svg-lod,canvas 500 1000 2 pan-1x,pan-fit,zoom
echo ALLDONE3
