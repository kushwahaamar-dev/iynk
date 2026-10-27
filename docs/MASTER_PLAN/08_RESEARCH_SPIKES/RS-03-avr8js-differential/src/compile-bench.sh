#!/bin/bash
# cold (empty build cache) then warm compiles of each sketch. Usage: compile-bench.sh
cd "$(dirname "$0")/.."
. ./env.sh
now() { python3 -c 'import time;print(time.time())'; }
rm -rf out buildcache; mkdir -p out
echo "uptime: $(uptime)"
run() { # label sketch cachedir
  local s=$(now)
  arduino-cli compile --fqbn arduino:avr:uno --build-cache-path "$3" --output-dir out/$2 sketches/$2 >/tmp/rs03-compile-$2.log 2>&1 || { echo FAIL; cat /tmp/rs03-compile-$2.log; }
  local e=$(now)
  printf "%s %s %.2f s\n" "$1" "$2" "$(echo "$e - $s" | bc)"
}
# cold: fresh empty build cache for the very first sketch compile
run cold-first blink "$PWD/buildcache"
# cold per sketch: fresh cache each
for s in motor knob; do rm -rf buildcache2; run cold-fresh-cache $s "$PWD/buildcache2"; done
rm -rf buildcache2
# warm: edit-free recompile reusing build cache (sketch dir unchanged, build path cache hit)
for i in 1 2 3; do for s in blink motor knob; do run warm$i $s "$PWD/buildcache"; done; done
# warm with an edit: change a constant so sketch must recompile, core cached
for s in blink motor knob; do mkdir -p /tmp/rs03-edit/$s; sed 's/^void setup/\/\/ edit '$RANDOM'\nvoid setup/' sketches/$s/$s.ino > /tmp/rs03-edit/$s/$s.ino; rm -rf /tmp/rs03-edit/out; local_s=$(now); arduino-cli compile --fqbn arduino:avr:uno --build-cache-path "$PWD/buildcache" --output-dir /tmp/rs03-edit/out /tmp/rs03-edit/$s >/dev/null 2>&1; local_e=$(now); printf "warm-edited %s %.2f s\n" $s "$(echo "$local_e - $local_s" | bc)"; done
ls -la out/*/*.hex; arduino-cli compile --fqbn arduino:avr:uno --output-dir /tmp/rs03-edit/o2 sketches/knob 2>&1 | tail -6
