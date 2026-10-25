# Phase 1: every lesson and task through the app check path

Generated 2026-10-24 by `IYNK_LESSON_TABLE=docs/verify/phase1-lessons.md npx vitest run src/lib/interp/lessons.test.ts`.
Each row runs `runChecks` (runHeadless + evaluateChecks, the same code the Board Lab and Robotics workers run) on the
reference code and on the starter (board lessons have no starter, so the empty program stands in). Variant is the lesson's first variant.

Reference passes: 59/59. Starter fails: 59/59.

| Item | Lesson / task | Variant | Reference | Starter | Checks (ref) | Run time |
|---|---|---|---|---|---|---|
| esp32-devkitc | blink | – | pass | fails | 3/3 | 0.0 s |
| esp32-devkitc | boot-button | – | pass | fails | 4/4 | 0.0 s |
| esp32-devkitc | touch | – | pass | fails | 3/3 | 0.0 s |
| esp32-devkitc | fade | – | pass | fails | 4/4 | 0.0 s |
| esp32-devkitc | web-switch | – | pass | fails | 4/4 | 2.2 s |
| esp32-s3-build | rgb-pin | – | pass | fails | 4/4 | 0.0 s |
| esp32-s3-build | web-led | – | pass | fails | 5/5 | 3.4 s |
| esp32-s3-build | boot-counter | – | pass | fails | 4/4 | 0.1 s |
| esp32-s3-build | reaction | – | pass | fails | 3/3 | 0.0 s |
| esp32-s3-devkitc-1 | blink | v1.1 | pass | fails | 4/4 | 0.0 s |
| esp32-s3-devkitc-1 | boot-button | v1.1 | pass | fails | 4/4 | 0.0 s |
| esp32-s3-devkitc-1 | dimmer | v1.1 | pass | fails | 6/6 | 0.0 s |
| esp32-s3-devkitc-1 | web-server | v1.1 | pass | fails | 5/5 | 2.1 s |
| nano | blink | – | pass | fails | 3/3 | 0.0 s |
| nano | button-sensor | – | pass | fails | 5/5 | 0.0 s |
| nano | fade | – | pass | fails | 4/4 | 0.0 s |
| nano | i2c | – | pass | fails | 4/4 | 0.0 s |
| nodemcu | blink | – | pass | fails | 4/4 | 0.0 s |
| nodemcu | button | – | pass | fails | 4/4 | 0.0 s |
| nodemcu | dimmer | – | pass | fails | 4/4 | 0.0 s |
| nodemcu | webserver | – | pass | fails | 5/5 | 1.3 s |
| pi5-ros2 | cmd-vel-10hz | – | pass | fails | 3/3 | 0.0 s |
| pi5-ros2 | diff-drive | – | pass | fails | 2/2 | 0.0 s |
| pi5-ros2 | range-pipeline | – | pass | fails | 3/3 | 0.0 s |
| pico | blink | pico | pass | fails | 3/3 | 0.0 s |
| pico | button | pico | pass | fails | 4/4 | 0.0 s |
| pico | fade | pico | pass | fails | 3/3 | 0.0 s |
| pico | i2c-mpu6050 | pico | pass | fails | 3/3 | 0.0 s |
| pico | wifi | pico-w | pass | fails | 3/3 | 0.0 s |
| pico | blink-cpp | pico | pass | fails | 3/3 | 0.0 s |
| tb6612fng | five-speeds | – | pass | fails | 11/11 | 0.0 s |
| tb6612fng | one-turn | – | pass | fails | 6/6 | 0.1 s |
| transistor-switch | pulse | – | pass | fails | 4/4 | 0.0 s |
| transistor-switch | soft-start | – | pass | fails | 5/5 | 0.4 s |
| transistor-switch | speed-knob | – | pass | fails | 5/5 | 0.4 s |
| transistor-switch | toggle-button | – | pass | fails | 5/5 | 0.0 s |
| uno-r3 | board | – | pass | fails | 3/3 | 0.0 s |
| uno-r3 | blink | – | pass | fails | 3/3 | 0.0 s |
| uno-r3 | button | – | pass | fails | 4/4 | 0.2 s |
| uno-r3 | knob | – | pass | fails | 5/5 | 0.0 s |
| uno-r3 | rgb | – | pass | fails | 3/3 | 0.0 s |
| uno-r3 | light | – | pass | fails | 4/4 | 0.0 s |
| uno-r3 | distance | – | pass | fails | 5/5 | 0.0 s |
| uno-r3 | sound | – | pass | fails | 3/3 | 0.0 s |
| uno-r3 | piano | – | pass | fails | 5/5 | 0.1 s |
| uno-r3 | motor | – | pass | fails | 3/3 | 0.0 s |
| uno-r3 | heat | – | pass | fails | 4/4 | 0.0 s |
| uno-r3 | servo | – | pass | fails | 3/3 | 0.0 s |
| uno-r3 | stepper | – | pass | fails | 3/3 | 0.0 s |
| uno-r3 | plant | – | pass | fails | 4/4 | 0.0 s |
| uno-r3 | force | – | pass | fails | 5/5 | 0.0 s |
| uno-r3 | parking | – | pass | fails | 5/5 | 0.0 s |
| uno-r4 | blink | minima | pass | fails | 2/2 | 0.0 s |
| uno-r4 | button | minima | pass | fails | 4/4 | 0.0 s |
| uno-r4 | pot-pwm | minima | pass | fails | 4/4 | 0.0 s |
| uno-r4 | dac-wave | minima | pass | fails | 3/3 | 0.0 s |
| uno-r4 | i2c-scan | minima | pass | fails | 3/3 | 0.0 s |
| uno-r4 | wifi | wifi | pass | fails | 3/3 | 0.0 s |
| uno-r4 | matrix | wifi | pass | fails | 3/3 | 0.0 s |
