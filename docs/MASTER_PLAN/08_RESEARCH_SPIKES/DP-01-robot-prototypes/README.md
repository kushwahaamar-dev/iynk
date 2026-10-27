# DP-01 robot and drone prototypes

Author-run prototypes behind `04_ARCHITECTURE/ROBOTICS_ARCHITECTURE.md` and `DRONE_ARCHITECTURE.md`. Label: VERIFIED as a prototype, author-run, not independently checked. They are not build inputs.

Rerun (Node 24, Apple M4 Pro for the recorded results):

    cd docs/MASTER_PLAN/08_RESEARCH_SPIKES/DP-01-robot-prototypes
    npm install
    for f in dbg sa16 order motor motor2 prop quad; do node src/$f.mjs; done

Split Rapier artifact (ROBOTICS_ARCHITECTURE 16.1). Needs the RS-13 `src` folder for the scene:

    npm pack @dimforge/rapier3d-deterministic-compat@0.21.0 && mkdir pkg && tar -xzf dimforge-rapier3d-deterministic-compat-0.21.0.tgz -C pkg
    node src/split-build.mjs pkg/package/dist out
    node src/run-split-hash.mjs ../RS-13-physics-determinism/src out

Package checks used in 16.1: `npm view <package> version dist.integrity gitHead`, `npm pack`, `shasum -a 256 rapier_wasm3d_bg.wasm`.

`results/` holds the raw output of the run on 2026-10-27 (`environment.txt` has the Node version, CPU architecture and script hashes). Independent check: none yet. Append it here and change the label when it exists.
