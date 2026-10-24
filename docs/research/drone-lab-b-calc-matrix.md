# Drone Lab (original), part B: design-calculator golden values

Every battery x motor x prop combination of Figs 05-13, computed by the original site's own `calc()` and `warnings()`
on the live page (https://drone-engineer.vercel.app), October 2026. Formulas and constants are in `drone-lab-b.md`.

Columns: `V` = cells x 3.7; `thrust` = grams per motor at full throttle; `AUW` = all-up weight in grams; `T:W` = n x thrust / AUW;
`hover thr` = sqrt(AUW / (n x thrust)) (for the wing: sqrt of cruise drag / thrust); `max A`, `hover A` in amps (wing: cruise A);
`hover min` and `fly min` in minutes (wing: cruise minutes and 0.8 x cruise; VTOL: hover minutes and cruise minutes);
`over` / `weak` = the warning flags; cost = Electrical / Mechanical / total in dollars; verdict = the warning text shown
(HTML stripped; the stock-calc craft Fig 12 shows the engine default text, abbreviated here as "OK Good all-round build.", which
renders as "Parts match. Good all-round build."). Long verdicts are cut at 140 characters. Values are rounded for display only.


## Fig 05 Racing quad (`racer`)

Default design: battery `4s1300`, motor `2207-2500`, prop `5x4.8x3` (marked **bold**).

| batt | motor | prop | V | thrust g/motor | AUW g | T:W | hover thr | max A | hover A | hover min | fly min | over | weak | cost E/M/total | verdict shown |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **4s1300** | **2207-2500** | **5x4.8x3** | **14.8** | **1523.7** | **443.2** | **13.752** | **0.27** | **216.7** | **8.76** | **7.13** | **2.99** |  |  | **279/63/342** | **Race-ready: 13.8:1 and about 3.0 minutes of racing per pack.** |
| 4s1300 | 2207-2500 | 5.1x3.6x3 | 14.8 | 1378.6 | 443.6 | 12.431 | 0.284 | 177.4 | 7.93 | 7.87 | 3.31 |  |  | 279/63/342 | Race-ready: 12.4:1 and about 3.3 minutes of racing per pack. |
| 4s1300 | 2207-2500 | 5x5.2x3 | 14.8 | 1625.3 | 444.8 | 14.616 | 0.262 | 249.6 | 9.49 | 6.58 | 2.76 |  |  | 279/63/342 | Race-ready: 14.6:1 and about 2.8 minutes of racing per pack. |
| 4s1300 | 2306-2700 | 5x4.8x3 | 14.8 | 1777.2 | 439.2 | 16.186 | 0.249 | 252.8 | 8.68 | 7.19 | 3.02 |  |  | 275/63/338 | Race-ready: 16.2:1 and about 3.0 minutes of racing per pack. |
| 4s1300 | 2306-2700 | 5.1x3.6x3 | 14.8 | 1608 | 439.6 | 14.631 | 0.261 | 206.9 | 7.86 | 7.94 | 3.34 |  |  | 275/63/338 | Race-ready: 14.6:1 and about 3.3 minutes of racing per pack. |
| 4s1300 | 2306-2700 | 5x5.2x3 | 14.8 | 1895.7 | 440.8 | 17.203 | 0.241 | 291.1 | 9.4 | 6.64 | 2.79 |  |  | 275/63/338 | Race-ready: 17.2:1 and about 2.8 minutes of racing per pack. |
| 4s1300 | 2207-1950 | 5x4.8x3 | 14.8 | 927 | 447.2 | 8.292 | 0.347 | 131.9 | 8.84 | 7.06 | 2.97 |  | Y | 283/63/346 | Thrust to weight 8.3:1 is too soft for racing (aim for 12:1+). A 6S motor on 4S feels like flying through syrup. |
| 4s1300 | 2207-1950 | 5.1x3.6x3 | 14.8 | 838.7 | 447.6 | 7.495 | 0.365 | 107.9 | 8 | 7.8 | 3.28 |  | Y | 283/63/346 | Thrust to weight 7.5:1 is too soft for racing (aim for 12:1+). A 6S motor on 4S feels like flying through syrup. |
| 4s1300 | 2207-1950 | 5x5.2x3 | 14.8 | 988.8 | 448.8 | 8.813 | 0.337 | 151.8 | 9.57 | 6.52 | 2.74 |  | Y | 283/63/346 | Thrust to weight 8.8:1 is too soft for racing (aim for 12:1+). A 6S motor on 4S feels like flying through syrup. |
| 4s1500 | 2207-2500 | 5x4.8x3 | 14.8 | 1523.7 | 469.2 | 12.99 | 0.277 | 216.7 | 9.27 | 7.77 | 3.26 |  |  | 281/63/344 | Race-ready: 13.0:1 and about 3.3 minutes of racing per pack. |
| 4s1500 | 2207-2500 | 5.1x3.6x3 | 14.8 | 1378.6 | 469.6 | 11.743 | 0.292 | 177.4 | 8.39 | 8.58 | 3.6 |  |  | 281/63/344 | Race-ready: 11.7:1 and about 3.6 minutes of racing per pack. |
| 4s1500 | 2207-2500 | 5x5.2x3 | 14.8 | 1625.3 | 470.8 | 13.809 | 0.269 | 249.6 | 10.04 | 7.17 | 3.01 |  |  | 281/63/344 | Race-ready: 13.8:1 and about 3.0 minutes of racing per pack. |
| 4s1500 | 2306-2700 | 5x4.8x3 | 14.8 | 1777.2 | 465.2 | 15.282 | 0.256 | 252.8 | 9.19 | 7.83 | 3.29 |  |  | 277/63/340 | Race-ready: 15.3:1 and about 3.3 minutes of racing per pack. |
| 4s1500 | 2306-2700 | 5.1x3.6x3 | 14.8 | 1608 | 465.6 | 13.814 | 0.269 | 206.9 | 8.32 | 8.65 | 3.63 |  |  | 277/63/340 | Race-ready: 13.8:1 and about 3.6 minutes of racing per pack. |
| 4s1500 | 2306-2700 | 5x5.2x3 | 14.8 | 1895.7 | 466.8 | 16.244 | 0.248 | 291.1 | 9.96 | 7.23 | 3.04 |  |  | 277/63/340 | Race-ready: 16.2:1 and about 3.0 minutes of racing per pack. |
| 4s1500 | 2207-1950 | 5x4.8x3 | 14.8 | 927 | 473.2 | 7.836 | 0.357 | 131.9 | 9.35 | 7.7 | 3.23 |  | Y | 285/63/348 | Thrust to weight 7.8:1 is too soft for racing (aim for 12:1+). A 6S motor on 4S feels like flying through syrup. |
| 4s1500 | 2207-1950 | 5.1x3.6x3 | 14.8 | 838.7 | 473.6 | 7.084 | 0.376 | 107.9 | 8.47 | 8.51 | 3.57 |  | Y | 285/63/348 | Thrust to weight 7.1:1 is too soft for racing (aim for 12:1+). A 6S motor on 4S feels like flying through syrup. |
| 4s1500 | 2207-1950 | 5x5.2x3 | 14.8 | 988.8 | 474.8 | 8.33 | 0.346 | 151.8 | 10.13 | 7.11 | 2.99 |  | Y | 285/63/348 | Thrust to weight 8.3:1 is too soft for racing (aim for 12:1+). A 6S motor on 4S feels like flying through syrup. |
| 6s1000 | 2207-2500 | 5x4.8x3 | 22.2 | 3428.3 | 455.2 | 30.126 | 0.182 | 325.1 | 6 | 8.01 | 3.36 | Y |  | 287/63/350 | 2500 KV on 6S: the props spin far past what the motors and ESC survive. Race 4S with ~2500 KV, or 6S with ~1950 KV. |
| 6s1000 | 2207-2500 | 5.1x3.6x3 | 22.2 | 3101.8 | 455.6 | 27.233 | 0.192 | 266.1 | 5.43 | 8.84 | 3.71 | Y |  | 287/63/350 | 2500 KV on 6S: the props spin far past what the motors and ESC survive. Race 4S with ~2500 KV, or 6S with ~1950 KV. |
| 6s1000 | 2207-2500 | 5x5.2x3 | 22.2 | 3656.9 | 456.8 | 32.022 | 0.177 | 374.4 | 6.5 | 7.39 | 3.1 | Y |  | 287/63/350 | 2500 KV on 6S: the props spin far past what the motors and ESC survive. Race 4S with ~2500 KV, or 6S with ~1950 KV. |
| 6s1000 | 2306-2700 | 5x4.8x3 | 22.2 | 3998.8 | 451.2 | 35.45 | 0.168 | 379.2 | 5.94 | 8.08 | 3.39 | Y |  | 283/63/346 | 2700 KV on 6S: the props spin far past what the motors and ESC survive. Race 4S with ~2500 KV, or 6S with ~1950 KV. |
| 6s1000 | 2306-2700 | 5.1x3.6x3 | 22.2 | 3618 | 451.6 | 32.046 | 0.177 | 310.4 | 5.38 | 8.92 | 3.75 | Y |  | 283/63/346 | 2700 KV on 6S: the props spin far past what the motors and ESC survive. Race 4S with ~2500 KV, or 6S with ~1950 KV. |
| 6s1000 | 2306-2700 | 5x5.2x3 | 22.2 | 4265.4 | 452.8 | 37.68 | 0.163 | 436.7 | 6.44 | 7.46 | 3.13 | Y |  | 283/63/346 | 2700 KV on 6S: the props spin far past what the motors and ESC survive. Race 4S with ~2500 KV, or 6S with ~1950 KV. |
| 6s1000 | 2207-1950 | 5x4.8x3 | 22.2 | 2085.8 | 459.2 | 18.169 | 0.235 | 197.8 | 6.05 | 7.94 | 3.33 |  |  | 291/63/354 | Race-ready: 18.2:1 and about 3.3 minutes of racing per pack. |
| 6s1000 | 2207-1950 | 5.1x3.6x3 | 22.2 | 1887.1 | 459.6 | 16.424 | 0.247 | 161.9 | 5.48 | 8.76 | 3.68 |  |  | 291/63/354 | Race-ready: 16.4:1 and about 3.7 minutes of racing per pack. |
| 6s1000 | 2207-1950 | 5x5.2x3 | 22.2 | 2224.8 | 460.8 | 19.313 | 0.228 | 227.8 | 6.55 | 7.33 | 3.08 |  |  | 291/63/354 | Race-ready: 19.3:1 and about 3.1 minutes of racing per pack. |

## Fig 06 GPS camera drone (`gpscam`)

Default design: battery `4s5000`, motor `2212-920`, prop `1045` (marked **bold**).

| batt | motor | prop | V | thrust g/motor | AUW g | T:W | hover thr | max A | hover A | hover min | fly min | over | weak | cost E/M/total | verdict shown |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **4s5000** | **2212-920** | **1045** | **14.8** | **1001.1** | **1600** | **2.503** | **0.632** | **79.6** | **12.01** | **19.98** | **15.98** |  |  | **581/76/657** | **Parts match: 2.5:1 is plenty for a camera drone, and the low hover current gives long flights.** |
| 4s5000 | 2212-920 | 1147 | 14.8 | 1181.3 | 1612 | 2.931 | 0.584 | 87 | 11.21 | 21.42 | 17.13 |  |  | 581/80/661 | Parts match: 2.9:1 is plenty for a camera drone, and the low hover current gives long flights. |
| 4s5000 | 2212-920 | 9450 | 14.8 | 820.9 | 1592 | 2.063 | 0.696 | 69.4 | 12.71 | 18.88 | 15.1 |  |  | 581/74/655 | Parts match: 2.1:1 is plenty for a camera drone, and the low hover current gives long flights. |
| 4s5000 | 2216-880 | 1045 | 14.8 | 916 | 1656 | 2.212 | 0.672 | 72.8 | 12.43 | 19.3 | 15.44 |  |  | 605/76/681 | Parts match: 2.2:1 is plenty for a camera drone, and the low hover current gives long flights. |
| 4s5000 | 2216-880 | 1147 | 14.8 | 1080.8 | 1668 | 2.592 | 0.621 | 79.6 | 11.59 | 20.7 | 16.56 |  |  | 605/80/685 | Parts match: 2.6:1 is plenty for a camera drone, and the low hover current gives long flights. |
| 4s5000 | 2216-880 | 9450 | 14.8 | 751.1 | 1648 | 1.823 | 0.741 | 63.5 | 13.16 | 18.23 | 14.59 |  |  | 605/74/679 | Parts match: 1.8:1 is plenty for a camera drone, and the low hover current gives long flights. |
| 4s5000 | 2212-1400 | 1045 | 14.8 | 2318.3 | 1592 | 5.825 | 0.414 | 184.3 | 11.95 | 20.08 | 16.06 | Y |  | 573/76/649 | 1400 KV on 4S with 10x4.5 two-blade props asks far more current than the motors and ESCs can take: they overheat and an ESC desyncs. Low ... |
| 4s5000 | 2212-1400 | 1147 | 14.8 | 2735.6 | 1604 | 6.822 | 0.383 | 201.3 | 11.15 | 21.52 | 17.22 | Y |  | 573/80/653 | 1400 KV on 4S with 11x4.7 two-blade props asks far more current than the motors and ESCs can take: they overheat and an ESC desyncs. Low ... |
| 4s5000 | 2212-1400 | 9450 | 14.8 | 1901 | 1584 | 4.801 | 0.456 | 160.8 | 12.65 | 18.97 | 15.18 |  |  | 573/74/647 | Parts match: 4.8:1 is plenty for a camera drone, and the low hover current gives long flights. |
| 4s3300 | 2212-920 | 1045 | 14.8 | 1001.1 | 1440 | 2.781 | 0.6 | 79.6 | 10.81 | 14.65 | 11.72 |  |  | 564/76/640 | Parts match: 2.8:1 is plenty for a camera drone, and the low hover current gives long flights. |
| 4s3300 | 2212-920 | 1147 | 14.8 | 1181.3 | 1452 | 3.254 | 0.554 | 87 | 10.09 | 15.69 | 12.55 |  |  | 564/80/644 | Parts match: 3.3:1 is plenty for a camera drone, and the low hover current gives long flights. |
| 4s3300 | 2212-920 | 9450 | 14.8 | 820.9 | 1432 | 2.293 | 0.66 | 69.4 | 11.44 | 13.85 | 11.08 |  |  | 564/74/638 | Parts match: 2.3:1 is plenty for a camera drone, and the low hover current gives long flights. |
| 4s3300 | 2216-880 | 1045 | 14.8 | 916 | 1496 | 2.449 | 0.639 | 72.8 | 11.23 | 14.1 | 11.28 |  |  | 588/76/664 | Parts match: 2.4:1 is plenty for a camera drone, and the low hover current gives long flights. |
| 4s3300 | 2216-880 | 1147 | 14.8 | 1080.8 | 1508 | 2.867 | 0.591 | 79.6 | 10.48 | 15.11 | 12.09 |  |  | 588/80/668 | Parts match: 2.9:1 is plenty for a camera drone, and the low hover current gives long flights. |
| 4s3300 | 2216-880 | 9450 | 14.8 | 751.1 | 1488 | 2.019 | 0.704 | 63.5 | 11.88 | 13.33 | 10.66 |  |  | 588/74/662 | Parts match: 2.0:1 is plenty for a camera drone, and the low hover current gives long flights. |
| 4s3300 | 2212-1400 | 1045 | 14.8 | 2318.3 | 1432 | 6.476 | 0.393 | 184.3 | 10.75 | 14.73 | 11.79 | Y |  | 556/76/632 | 1400 KV on 4S with 10x4.5 two-blade props asks far more current than the motors and ESCs can take: they overheat and an ESC desyncs. Low ... |
| 4s3300 | 2212-1400 | 1147 | 14.8 | 2735.6 | 1444 | 7.578 | 0.363 | 201.3 | 10.04 | 15.78 | 12.62 | Y |  | 556/80/636 | 1400 KV on 4S with 11x4.7 two-blade props asks far more current than the motors and ESCs can take: they overheat and an ESC desyncs. Low ... |
| 4s3300 | 2212-1400 | 9450 | 14.8 | 1901 | 1424 | 5.34 | 0.433 | 160.8 | 11.37 | 13.93 | 11.14 |  |  | 556/74/630 | Parts match: 5.3:1 is plenty for a camera drone, and the low hover current gives long flights. |
| 3s5000 | 2212-920 | 1045 | 11.1 | 563.1 | 1510 | 1.492 | 0.819 | 59.7 | 15.12 | 15.88 | 12.7 |  | Y | 566/76/642 | Thrust to weight 1.5:1 is too low: it will barely climb and can't hold position in wind. A camera drone wants about 2:1 or more. |
| 3s5000 | 2212-920 | 1147 | 11.1 | 664.5 | 1522 | 1.746 | 0.757 | 65.2 | 14.11 | 17.01 | 13.61 |  | Y | 566/80/646 | Thrust to weight 1.7:1 is too low: it will barely climb and can't hold position in wind. A camera drone wants about 2:1 or more. |
| 3s5000 | 2212-920 | 9450 | 11.1 | 461.8 | 1502 | 1.23 | 0.902 | 52.1 | 15.99 | 15 | 12 |  | Y | 566/74/640 | Thrust to weight 1.2:1 is too low: it will barely climb and can't hold position in wind. A camera drone wants about 2:1 or more. |
| 3s5000 | 2216-880 | 1045 | 11.1 | 515.2 | 1566 | 1.316 | 0.872 | 54.6 | 15.68 | 15.31 | 12.25 |  | Y | 590/76/666 | Thrust to weight 1.3:1 is too low: it will barely climb and can't hold position in wind. A camera drone wants about 2:1 or more. |
| 3s5000 | 2216-880 | 1147 | 11.1 | 608 | 1578 | 1.541 | 0.806 | 59.7 | 14.63 | 16.41 | 13.13 |  | Y | 590/80/670 | Thrust to weight 1.5:1 is too low: it will barely climb and can't hold position in wind. A camera drone wants about 2:1 or more. |
| 3s5000 | 2216-880 | 9450 | 11.1 | 422.5 | 1558 | 1.085 | 0.96 | 47.6 | 16.59 | 14.47 | 11.57 |  | Y | 590/74/664 | Thrust to weight 1.1:1 is too low: it will barely climb and can't hold position in wind. A camera drone wants about 2:1 or more. |
| 3s5000 | 2212-1400 | 1045 | 11.1 | 1304.1 | 1502 | 3.473 | 0.537 | 138.2 | 15.04 | 15.96 | 12.77 |  |  | 558/76/634 | Parts match: 3.5:1 is plenty for a camera drone, and the low hover current gives long flights. |
| 3s5000 | 2212-1400 | 1147 | 11.1 | 1538.8 | 1514 | 4.065 | 0.496 | 151 | 14.03 | 17.1 | 13.68 | Y |  | 558/80/638 | 1400 KV on 3S with 11x4.7 two-blade props asks far more current than the motors and ESCs can take: they overheat and an ESC desyncs. Low ... |
| 3s5000 | 2212-1400 | 9450 | 11.1 | 1069.3 | 1494 | 2.863 | 0.591 | 120.6 | 15.91 | 15.09 | 12.07 |  |  | 558/74/632 | Parts match: 2.9:1 is plenty for a camera drone, and the low hover current gives long flights. |

## Fig 07 Delivery drone (`delivery`)

Default design: battery `6s10000`, motor `4114-400`, prop `15x5.5` (marked **bold**).

| batt | motor | prop | V | thrust g/motor | AUW g | T:W | hover thr | max A | hover A | hover min | fly min | over | weak | cost E/M/total | verdict shown |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **6s10000** | **4114-400** | **15x5.5** | **22.2** | **2523.3** | **5177** | **1.95** | **0.716** | **126.3** | **24.55** | **19.55** | **16.62** |  |  | **1375/367/1742** | **Parts match: 1.9:1 with the parcel aboard, about 17 min of delivery flying.** |
| 6s10000 | 4114-400 | 14x4.8 | 22.2 | 2069.1 | 5161 | 1.604 | 0.79 | 97.7 | 23.09 | 20.79 | 17.67 |  |  | 1375/355/1730 | Parts match: 1.6:1 with the parcel aboard, about 18 min of delivery flying. |
| 6s10000 | 4114-400 | 16x5.4 | 22.2 | 2977.5 | 5201 | 2.29 | 0.661 | 156.9 | 25.96 | 18.49 | 15.72 |  |  | 1375/379/1754 | Parts match: 2.3:1 with the parcel aboard, about 16 min of delivery flying. |
| 6s10000 | 5010-360 | 15x5.5 | 22.2 | 2043.9 | 5089 | 1.607 | 0.789 | 102.3 | 24.13 | 19.89 | 16.91 |  |  | 1327/367/1694 | Parts match: 1.6:1 with the parcel aboard, about 17 min of delivery flying. |
| 6s10000 | 5010-360 | 14x4.8 | 22.2 | 1676 | 5073 | 1.322 | 0.87 | 79.1 | 22.69 | 21.15 | 17.98 |  | Y | 1327/355/1682 | Thrust to weight 1.32:1 with the 1 kg parcel. Below about 1.6:1 a heavy-lift drone can't climb out of a gust or survive a sagging battery... |
| 6s10000 | 5010-360 | 16x5.4 | 22.2 | 2411.8 | 5113 | 1.887 | 0.728 | 127.1 | 25.52 | 18.81 | 15.99 |  |  | 1327/379/1706 | Parts match: 1.9:1 with the parcel aboard, about 16 min of delivery flying. |
| 6s10000 | 2814-700 | 15x5.5 | 22.2 | 7727.7 | 5037 | 6.137 | 0.404 | 386.8 | 23.88 | 20.1 | 17.08 | Y |  | 1271/367/1638 | 700 KV on 6S spins 15" props far too fast: the motors overheat and the ESCs desync. Big props want low KV (300-450 KV on 6S). |
| 6s10000 | 2814-700 | 14x4.8 | 22.2 | 6336.7 | 5021 | 5.048 | 0.445 | 299.2 | 22.46 | 21.37 | 18.17 | Y |  | 1271/355/1626 | 700 KV on 6S spins 15" props far too fast: the motors overheat and the ESCs desync. Big props want low KV (300-450 KV on 6S). |
| 6s10000 | 2814-700 | 16x5.4 | 22.2 | 9118.7 | 5061 | 7.207 | 0.372 | 480.4 | 25.26 | 19 | 16.15 | Y |  | 1271/379/1650 | 700 KV on 6S spins 15" props far too fast: the motors overheat and the ESCs desync. Big props want low KV (300-450 KV on 6S). |
| 6s16000 | 4114-400 | 15x5.5 | 22.2 | 2523.3 | 5877 | 1.717 | 0.763 | 126.3 | 27.87 | 27.56 | 23.43 |  |  | 1460/367/1827 | Parts match: 1.7:1 with the parcel aboard, about 23 min of delivery flying. |
| 6s16000 | 4114-400 | 14x4.8 | 22.2 | 2069.1 | 5861 | 1.412 | 0.842 | 97.7 | 26.22 | 29.29 | 24.9 |  | Y | 1460/355/1815 | Thrust to weight 1.41:1 with the 1 kg parcel. Below about 1.6:1 a heavy-lift drone can't climb out of a gust or survive a sagging battery... |
| 6s16000 | 4114-400 | 16x5.4 | 22.2 | 2977.5 | 5901 | 2.018 | 0.704 | 156.9 | 29.45 | 26.08 | 22.16 |  |  | 1460/379/1839 | Parts match: 2.0:1 with the parcel aboard, about 22 min of delivery flying. |
| 6s16000 | 5010-360 | 15x5.5 | 22.2 | 2043.9 | 5789 | 1.412 | 0.841 | 102.3 | 27.45 | 27.98 | 23.78 |  | Y | 1412/367/1779 | Thrust to weight 1.41:1 with the 1 kg parcel. Below about 1.6:1 a heavy-lift drone can't climb out of a gust or survive a sagging battery... |
| 6s16000 | 5010-360 | 14x4.8 | 22.2 | 1676 | 5773 | 1.161 | 0.928 | 79.1 | 25.82 | 29.74 | 25.28 |  | Y | 1412/355/1767 | Thrust to weight 1.16:1 with the 1 kg parcel. Below about 1.6:1 a heavy-lift drone can't climb out of a gust or survive a sagging battery... |
| 6s16000 | 5010-360 | 16x5.4 | 22.2 | 2411.8 | 5813 | 1.66 | 0.776 | 127.1 | 29.01 | 26.47 | 22.5 |  |  | 1412/379/1791 | Parts match: 1.7:1 with the parcel aboard, about 22 min of delivery flying. |
| 6s16000 | 2814-700 | 15x5.5 | 22.2 | 7727.7 | 5737 | 5.388 | 0.431 | 386.8 | 27.2 | 28.23 | 24 | Y |  | 1356/367/1723 | 700 KV on 6S spins 15" props far too fast: the motors overheat and the ESCs desync. Big props want low KV (300-450 KV on 6S). |
| 6s16000 | 2814-700 | 14x4.8 | 22.2 | 6336.7 | 5721 | 4.431 | 0.475 | 299.2 | 25.59 | 30.01 | 25.51 | Y |  | 1356/355/1711 | 700 KV on 6S spins 15" props far too fast: the motors overheat and the ESCs desync. Big props want low KV (300-450 KV on 6S). |
| 6s16000 | 2814-700 | 16x5.4 | 22.2 | 9118.7 | 5761 | 6.331 | 0.397 | 480.4 | 28.75 | 26.71 | 22.7 | Y |  | 1356/379/1735 | 700 KV on 6S spins 15" props far too fast: the motors overheat and the ESCs desync. Big props want low KV (300-450 KV on 6S). |
| 4s10000 | 4114-400 | 15x5.5 | 14.8 | 1121.5 | 4707 | 0.953 | 1.024 | 84.2 | 33.48 | 14.34 | 12.19 |  | Y | 1325/367/1692 | Thrust to weight 0.95:1 with the 1 kg parcel. Below about 1.6:1 a heavy-lift drone can't climb out of a gust or survive a sagging battery... |
| 4s10000 | 4114-400 | 14x4.8 | 14.8 | 919.6 | 4691 | 0.784 | 1.129 | 65.1 | 31.48 | 15.25 | 12.96 |  | Y | 1325/355/1680 | Thrust to weight 0.78:1 with the 1 kg parcel. Below about 1.6:1 a heavy-lift drone can't climb out of a gust or survive a sagging battery... |
| 4s10000 | 4114-400 | 16x5.4 | 14.8 | 1323.4 | 4731 | 1.119 | 0.945 | 104.6 | 35.42 | 13.55 | 11.52 |  | Y | 1325/379/1704 | Thrust to weight 1.12:1 with the 1 kg parcel. Below about 1.6:1 a heavy-lift drone can't climb out of a gust or survive a sagging battery... |
| 4s10000 | 5010-360 | 15x5.5 | 14.8 | 908.4 | 4619 | 0.787 | 1.127 | 68.2 | 32.85 | 14.61 | 12.42 |  | Y | 1277/367/1644 | Thrust to weight 0.79:1 with the 1 kg parcel. Below about 1.6:1 a heavy-lift drone can't climb out of a gust or survive a sagging battery... |
| 4s10000 | 5010-360 | 14x4.8 | 14.8 | 744.9 | 4603 | 0.647 | 1.243 | 52.8 | 30.89 | 15.54 | 13.21 |  | Y | 1277/355/1632 | Thrust to weight 0.65:1 with the 1 kg parcel. Below about 1.6:1 a heavy-lift drone can't climb out of a gust or survive a sagging battery... |
| 4s10000 | 5010-360 | 16x5.4 | 14.8 | 1071.9 | 4643 | 0.923 | 1.041 | 84.7 | 34.76 | 13.81 | 11.74 |  | Y | 1277/379/1656 | Thrust to weight 0.92:1 with the 1 kg parcel. Below about 1.6:1 a heavy-lift drone can't climb out of a gust or survive a sagging battery... |
| 4s10000 | 2814-700 | 15x5.5 | 14.8 | 3434.5 | 4567 | 3.008 | 0.577 | 257.8 | 32.48 | 14.78 | 12.56 |  |  | 1221/367/1588 | Parts match: 3.0:1 with the parcel aboard, about 13 min of delivery flying. |
| 4s10000 | 2814-700 | 14x4.8 | 14.8 | 2816.3 | 4551 | 2.475 | 0.636 | 199.5 | 30.54 | 15.72 | 13.36 |  |  | 1221/355/1576 | Parts match: 2.5:1 with the parcel aboard, about 13 min of delivery flying. |
| 4s10000 | 2814-700 | 16x5.4 | 14.8 | 4052.8 | 4591 | 3.531 | 0.532 | 320.3 | 34.37 | 13.97 | 11.87 |  |  | 1221/379/1600 | Parts match: 3.5:1 with the parcel aboard, about 12 min of delivery flying. |

## Fig 08 Agri hexacopter (`agrihex`)

Default design: battery `12s22`, motor `8120-100`, prop `30x9.9` (marked **bold**).

| batt | motor | prop | V | thrust g/motor | AUW g | T:W | hover thr | max A | hover A | hover min | fly min | over | weak | cost E/M/total | verdict shown |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **12s22** | **8120-100** | **30x9.9** | **44.4** | **10842.5** | **33265** | **1.956** | **0.715** | **457.9** | **83.25** | **12.69** | **10.15** |  |  | **4050/1180/5230** | **Parts match: 1.96:1 with 10 L aboard, enough margin to fight wind while full.** |
| 12s22 | 8120-100 | 28x9.2 | 44.4 | 9324.5 | 33145 | 1.688 | 0.77 | 364.6 | 76.8 | 13.75 | 11 |  |  | 4050/1150/5200 | Parts match: 1.69:1 with 10 L aboard, enough margin to fight wind while full. |
| 12s22 | 8120-100 | 32x11 | 44.4 | 12360.4 | 33445 | 2.217 | 0.672 | 561.3 | 90 | 11.73 | 9.39 |  |  | 4050/1225/5275 | Parts match: 2.22:1 with 10 L aboard, enough margin to fight wind while full. |
| 12s22 | 10025-80 | 30x9.9 | 44.4 | 6939.2 | 34585 | 1.204 | 0.911 | 293 | 86.55 | 12.2 | 9.76 |  | Y | 4530/1180/5710 | Thrust to weight 1.20:1 with a full tank. Agri drones need about 1.8:1 or more to stay controllable in gusts while heavy. |
| 12s22 | 10025-80 | 28x9.2 | 44.4 | 5967.7 | 34465 | 1.039 | 0.981 | 233.3 | 79.86 | 13.22 | 10.58 |  | Y | 4530/1150/5680 | Thrust to weight 1.04:1 with a full tank. Agri drones need about 1.8:1 or more to stay controllable in gusts while heavy. |
| 12s22 | 10025-80 | 32x11 | 44.4 | 7910.7 | 34765 | 1.365 | 0.856 | 359.2 | 93.55 | 11.29 | 9.03 |  | Y | 4530/1225/5755 | Thrust to weight 1.37:1 with a full tank. Agri drones need about 1.8:1 or more to stay controllable in gusts while heavy. |
| 12s22 | 6215-180 | 30x9.9 | 44.4 | 35129.6 | 31825 | 6.623 | 0.389 | 1483.5 | 79.64 | 13.26 | 10.61 | Y |  | 3690/1180/4870 | 180 KV on 12S spins a 30" prop far too fast: the motors overheat and the ESCs desync with a full tank. |
| 12s22 | 6215-180 | 28x9.2 | 44.4 | 30211.5 | 31705 | 5.717 | 0.418 | 1181.3 | 73.46 | 14.37 | 11.5 | Y |  | 3690/1150/4840 | 180 KV on 12S spins a 30" prop far too fast: the motors overheat and the ESCs desync with a full tank. |
| 12s22 | 6215-180 | 32x11 | 44.4 | 40047.8 | 32005 | 7.508 | 0.365 | 1818.5 | 86.12 | 12.26 | 9.81 | Y |  | 3690/1225/4915 | 180 KV on 12S spins a 30" prop far too fast: the motors overheat and the ESCs desync with a full tank. |
| 12s16 | 8120-100 | 30x9.9 | 44.4 | 10842.5 | 31965 | 2.035 | 0.701 | 457.9 | 79.99 | 9.6 | 7.68 |  |  | 3910/1180/5090 | Parts match: 2.04:1 with 10 L aboard, enough margin to fight wind while full. |
| 12s16 | 8120-100 | 28x9.2 | 44.4 | 9324.5 | 31845 | 1.757 | 0.754 | 364.6 | 73.79 | 10.41 | 8.33 |  |  | 3910/1150/5060 | Parts match: 1.76:1 with 10 L aboard, enough margin to fight wind while full. |
| 12s16 | 8120-100 | 32x11 | 44.4 | 12360.4 | 32145 | 2.307 | 0.658 | 561.3 | 86.5 | 8.88 | 7.1 |  |  | 3910/1225/5135 | Parts match: 2.31:1 with 10 L aboard, enough margin to fight wind while full. |
| 12s16 | 10025-80 | 30x9.9 | 44.4 | 6939.2 | 33285 | 1.251 | 0.894 | 293 | 83.3 | 9.22 | 7.38 |  | Y | 4390/1180/5570 | Thrust to weight 1.25:1 with a full tank. Agri drones need about 1.8:1 or more to stay controllable in gusts while heavy. |
| 12s16 | 10025-80 | 28x9.2 | 44.4 | 5967.7 | 33165 | 1.08 | 0.962 | 233.3 | 76.85 | 9.99 | 8 |  | Y | 4390/1150/5540 | Thrust to weight 1.08:1 with a full tank. Agri drones need about 1.8:1 or more to stay controllable in gusts while heavy. |
| 12s16 | 10025-80 | 32x11 | 44.4 | 7910.7 | 33465 | 1.418 | 0.84 | 359.2 | 90.05 | 8.53 | 6.82 |  | Y | 4390/1225/5615 | Thrust to weight 1.42:1 with a full tank. Agri drones need about 1.8:1 or more to stay controllable in gusts while heavy. |
| 12s16 | 6215-180 | 30x9.9 | 44.4 | 35129.6 | 30525 | 6.905 | 0.381 | 1483.5 | 76.39 | 10.05 | 8.04 | Y |  | 3550/1180/4730 | 180 KV on 12S spins a 30" prop far too fast: the motors overheat and the ESCs desync with a full tank. |
| 12s16 | 6215-180 | 28x9.2 | 44.4 | 30211.5 | 30405 | 5.962 | 0.41 | 1181.3 | 70.45 | 10.9 | 8.72 | Y |  | 3550/1150/4700 | 180 KV on 12S spins a 30" prop far too fast: the motors overheat and the ESCs desync with a full tank. |
| 12s16 | 6215-180 | 32x11 | 44.4 | 40047.8 | 30705 | 7.826 | 0.357 | 1818.5 | 82.62 | 9.3 | 7.44 | Y |  | 3550/1225/4775 | 180 KV on 12S spins a 30" prop far too fast: the motors overheat and the ESCs desync with a full tank. |
| 14s30 | 8120-100 | 30x9.9 | 51.8 | 14757.8 | 37465 | 2.363 | 0.65 | 534.2 | 80.36 | 17.92 | 14.34 |  |  | 4580/1180/5760 | Parts match: 2.36:1 with 10 L aboard, enough margin to fight wind while full. |
| 14s30 | 8120-100 | 28x9.2 | 51.8 | 12691.7 | 37345 | 2.039 | 0.7 | 425.4 | 74.17 | 19.41 | 15.53 |  |  | 4580/1150/5730 | Parts match: 2.04:1 with 10 L aboard, enough margin to fight wind while full. |
| 14s30 | 8120-100 | 32x11 | 51.8 | 16823.9 | 37645 | 2.681 | 0.611 | 654.8 | 86.83 | 16.58 | 13.27 |  |  | 4580/1225/5805 | Parts match: 2.68:1 with 10 L aboard, enough margin to fight wind while full. |
| 14s30 | 10025-80 | 30x9.9 | 51.8 | 9445 | 38785 | 1.461 | 0.827 | 341.9 | 83.19 | 17.31 | 13.85 |  | Y | 5060/1180/6240 | Thrust to weight 1.46:1 with a full tank. Agri drones need about 1.8:1 or more to stay controllable in gusts while heavy. |
| 14s30 | 10025-80 | 28x9.2 | 51.8 | 8122.7 | 38665 | 1.26 | 0.891 | 272.2 | 76.79 | 18.75 | 15 |  | Y | 5060/1150/6210 | Thrust to weight 1.26:1 with a full tank. Agri drones need about 1.8:1 or more to stay controllable in gusts while heavy. |
| 14s30 | 10025-80 | 32x11 | 51.8 | 10767.3 | 38965 | 1.658 | 0.777 | 419.1 | 89.87 | 16.02 | 12.82 |  |  | 5060/1225/6285 | Parts match: 1.66:1 with 10 L aboard, enough margin to fight wind while full. |
| 14s30 | 6215-180 | 30x9.9 | 51.8 | 47815.3 | 36025 | 7.964 | 0.354 | 1730.8 | 77.27 | 18.64 | 14.91 | Y |  | 4220/1180/5400 | 180 KV on 14S spins a 30" prop far too fast: the motors overheat and the ESCs desync with a full tank. |
| 14s30 | 6215-180 | 28x9.2 | 51.8 | 41121.2 | 35905 | 6.872 | 0.381 | 1378.2 | 71.31 | 20.19 | 16.15 | Y |  | 4220/1150/5370 | 180 KV on 14S spins a 30" prop far too fast: the motors overheat and the ESCs desync with a full tank. |
| 14s30 | 6215-180 | 32x11 | 51.8 | 54509.5 | 36205 | 9.033 | 0.333 | 2121.6 | 83.51 | 17.24 | 13.8 | Y |  | 4220/1225/5445 | 180 KV on 14S spins a 30" prop far too fast: the motors overheat and the ESCs desync with a full tank. |

## Fig 09 FPV flying wing (`wing`)

Default design: battery `4s2200`, motor `2212-1400`, prop `8x6` (marked **bold**).

| batt | motor | prop | V | thrust g/motor | AUW g | T:W | hover thr | max A | hover A | hover min | fly min | cruise km/h | stall km/h | top km/h | over | weak | cost E/M/total | verdict shown |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **4s2200** | **2212-1400** | **8x6** | **14.8** | **1073.3** | **825** | **1.301** | **0.358** | **33** | **3.67** | **30.55** | **24.44** | **52.2** | **27.6** | **145.9** |  |  | **229/66/295** | **Parts match. Cruise throttle ~36%, 4 A.** |
| 4s2200 | 2212-1400 | 7x5 | 14.8 | 805 | 822 | 0.979 | 0.413 | 23.5 | 3.48 | 32.25 | 25.8 | 52.1 | 27.6 | 126.4 |  |  | 229/66/295 | Parts match. Cruise throttle ~41%, 3 A. |
| 4s2200 | 2212-1400 | 9x6 | 14.8 | 1341.6 | 828 | 1.62 | 0.321 | 43.4 | 3.89 | 28.87 | 23.09 | 52.3 | 27.7 | 163.1 |  |  | 229/67/296 | Parts match. Cruise throttle ~32%, 4 A. |
| 4s2200 | 2810-1100 | 8x6 | 14.8 | 662.6 | 850 | 0.78 | 0.462 | 20.3 | 3.84 | 29.21 | 23.37 | 53 | 28 | 114.6 |  |  | 239/66/305 | Parts match. Cruise throttle ~46%, 4 A. |
| 4s2200 | 2810-1100 | 7x5 | 14.8 | 496.9 | 847 | 0.587 | 0.533 | 14.5 | 3.64 | 30.84 | 24.67 | 52.9 | 28 | 99.3 |  |  | 239/66/305 | Parts match. Cruise throttle ~53%, 4 A. |
| 4s2200 | 2810-1100 | 9x6 | 14.8 | 828.2 | 853 | 0.971 | 0.414 | 26.8 | 4.06 | 27.61 | 22.08 | 53.1 | 28.1 | 128.2 |  |  | 239/67/306 | Parts match. Cruise throttle ~41%, 4 A. |
| 4s2200 | 2306-2400 | 8x6 | 14.8 | 3154.2 | 803 | 3.928 | 0.206 | 96.9 | 3.53 | 31.81 | 25.45 | 51.5 | 27.3 | 250.1 | Y |  | 231/66/297 | 97 A at full throttle: past the 40 A ESC. A quad motor at this KV with a big prop overloads it. |
| 4s2200 | 2306-2400 | 7x5 | 14.8 | 2365.6 | 800 | 2.957 | 0.237 | 69.2 | 3.34 | 33.59 | 26.87 | 51.4 | 27.2 | 216.6 | Y |  | 231/66/297 | 69 A at full throttle: past the 40 A ESC. A quad motor at this KV with a big prop overloads it. |
| 4s2200 | 2306-2400 | 9x6 | 14.8 | 3942.7 | 806 | 4.892 | 0.185 | 127.5 | 3.73 | 30.05 | 24.04 | 51.6 | 27.3 | 279.7 | Y |  | 231/67/298 | 127 A at full throttle: past the 40 A ESC. A quad motor at this KV with a big prop overloads it. |
| 4s3000li | 2212-1400 | 8x6 | 14.8 | 1073.3 | 860 | 1.248 | 0.365 | 33 | 3.91 | 39.14 | 31.31 | 53.3 | 28.2 | 145.9 |  |  | 240/66/306 | Parts match. Cruise throttle ~37%, 4 A. |
| 4s3000li | 2212-1400 | 7x5 | 14.8 | 805 | 857 | 0.939 | 0.421 | 23.5 | 3.7 | 41.32 | 33.05 | 53.2 | 28.2 | 126.4 |  |  | 240/66/306 | Parts match. Cruise throttle ~42%, 4 A. |
| 4s3000li | 2212-1400 | 9x6 | 14.8 | 1341.6 | 863 | 1.555 | 0.327 | 43.4 | 4.14 | 36.99 | 29.59 | 53.4 | 28.3 | 163.1 |  |  | 240/67/307 | Parts match. Cruise throttle ~33%, 4 A. |
| 4s3000li | 2810-1100 | 8x6 | 14.8 | 662.6 | 885 | 0.749 | 0.472 | 20.3 | 4.08 | 37.5 | 30 | 54.1 | 28.6 | 114.6 |  |  | 250/66/316 | Parts match. Cruise throttle ~47%, 4 A. |
| 4s3000li | 2810-1100 | 7x5 | 14.8 | 496.9 | 882 | 0.563 | 0.544 | 14.5 | 3.87 | 39.57 | 31.66 | 54 | 28.6 | 99.3 |  |  | 250/66/316 | Parts match. Cruise throttle ~54%, 4 A. |
| 4s3000li | 2810-1100 | 9x6 | 14.8 | 828.2 | 888 | 0.933 | 0.423 | 26.8 | 4.32 | 35.44 | 28.35 | 54.2 | 28.7 | 128.2 |  |  | 250/67/317 | Parts match. Cruise throttle ~42%, 4 A. |
| 4s3000li | 2306-2400 | 8x6 | 14.8 | 3154.2 | 838 | 3.764 | 0.21 | 96.9 | 3.76 | 40.69 | 32.55 | 52.6 | 27.8 | 250.1 | Y |  | 242/66/308 | 97 A at full throttle: past the 40 A ESC. A quad motor at this KV with a big prop overloads it. |
| 4s3000li | 2306-2400 | 7x5 | 14.8 | 2365.6 | 835 | 2.833 | 0.243 | 69.2 | 3.56 | 42.96 | 34.37 | 52.5 | 27.8 | 216.6 | Y |  | 242/66/308 | 69 A at full throttle: past the 40 A ESC. A quad motor at this KV with a big prop overloads it. |
| 4s3000li | 2306-2400 | 9x6 | 14.8 | 3942.7 | 841 | 4.688 | 0.189 | 127.5 | 3.98 | 38.45 | 30.76 | 52.7 | 27.9 | 279.7 | Y |  | 242/67/309 | 127 A at full throttle: past the 40 A ESC. A quad motor at this KV with a big prop overloads it. |
| 3s1300 | 2212-1400 | 8x6 | 11.1 | 603.7 | 705 | 0.856 | 0.441 | 24.7 | 3.87 | 17.14 | 13.71 | 48.3 | 25.5 | 109.4 |  |  | 215/66/281 | This light pack leaves the wing tail-heavy. Add nose weight or move the pack forward: run the CG check. |
| 3s1300 | 2212-1400 | 7x5 | 11.1 | 452.8 | 702 | 0.645 | 0.508 | 17.7 | 3.66 | 18.11 | 14.49 | 48.2 | 25.5 | 94.8 |  |  | 215/66/281 | This light pack leaves the wing tail-heavy. Add nose weight or move the pack forward: run the CG check. |
| 3s1300 | 2212-1400 | 9x6 | 11.1 | 754.7 | 708 | 1.066 | 0.395 | 32.5 | 4.1 | 16.18 | 12.94 | 48.4 | 25.6 | 122.3 |  |  | 215/67/282 | This light pack leaves the wing tail-heavy. Add nose weight or move the pack forward: run the CG check. |
| 3s1300 | 2810-1100 | 8x6 | 11.1 | 372.7 | 730 | 0.511 | 0.571 | 15.3 | 4.08 | 16.27 | 13.01 | 49.1 | 26 | 86 |  |  | 225/66/291 | This light pack leaves the wing tail-heavy. Add nose weight or move the pack forward: run the CG check. |
| 3s1300 | 2810-1100 | 7x5 | 11.1 | 279.5 | 727 | 0.385 | 0.658 | 10.9 | 3.86 | 17.19 | 13.75 | 49 | 25.9 | 74.5 |  | Y | 225/66/291 | Thrust only 0.38x the weight: launches will sink. Aim for 0.5-0.8. This light pack leaves the wing tail-heavy. Add nose weight or move th... |
| 3s1300 | 2810-1100 | 9x6 | 11.1 | 465.9 | 733 | 0.636 | 0.512 | 20.1 | 4.32 | 15.36 | 12.29 | 49.2 | 26 | 96.1 |  |  | 225/67/292 | This light pack leaves the wing tail-heavy. Add nose weight or move the pack forward: run the CG check. |
| 3s1300 | 2306-2400 | 8x6 | 11.1 | 1774.2 | 683 | 2.598 | 0.253 | 72.7 | 3.69 | 17.97 | 14.38 | 47.5 | 25.1 | 187.6 | Y |  | 217/66/283 | 73 A at full throttle: past the 40 A ESC. A quad motor at this KV with a big prop overloads it. This light pack leaves the wing tail-heav... |
| 3s1300 | 2306-2400 | 7x5 | 11.1 | 1330.7 | 680 | 1.957 | 0.292 | 51.9 | 3.49 | 19 | 15.2 | 47.4 | 25.1 | 162.5 | Y |  | 217/66/283 | 52 A at full throttle: past the 40 A ESC. A quad motor at this KV with a big prop overloads it. This light pack leaves the wing tail-heav... |
| 3s1300 | 2306-2400 | 9x6 | 11.1 | 2217.8 | 686 | 3.233 | 0.227 | 95.6 | 3.91 | 16.96 | 13.57 | 47.6 | 25.2 | 209.7 | Y |  | 217/67/284 | 96 A at full throttle: past the 40 A ESC. A quad motor at this KV with a big prop overloads it. This light pack leaves the wing tail-heav... |

## Fig 10 VTOL tiltrotor (`vtol`)

Default design: battery `4s2p-li`, motor `2810-1000`, prop `9x5` (marked **bold**).

| batt | motor | prop | V | thrust g/motor | AUW g | T:W | hover thr | max A | hover A | hover min | fly min | cruise A | over | weak | cost E/M/total | verdict shown |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **4s2p-li** | **2810-1000** | **9x5** | **14.8** | **1489.5** | **1585** | **2.819** | **0.596** | **116.1** | **15.3** | **25.1** | **75.91** | **5.1** |  |  | **445/224/669** | **Parts match. Cruise draws about 5 A against 15 A in hover: the wing does the work. Freestyle time below = cruise time.** |
| 4s2p-li | 2810-1000 | 10x5 | 14.8 | 1787.4 | 1591 | 3.37 | 0.545 | 129 | 14.22 | 27.01 | 75.63 | 5.1 |  |  | 445/227/672 | Parts match. Cruise draws about 5 A against 14 A in hover: the wing does the work. Freestyle time below = cruise time. |
| 4s2p-li | 2810-1000 | 7x4 | 14.8 | 893.7 | 1573 | 1.704 | 0.766 | 82 | 17.86 | 21.5 | 76.49 | 5 |  |  | 445/218/663 | Parts match. Cruise draws about 5 A against 18 A in hover: the wing does the work. Freestyle time below = cruise time. |
| 4s2p-li | 2814-700 | 9x5 | 14.8 | 729.8 | 1657 | 1.321 | 0.87 | 56.9 | 15.99 | 24.01 | 72.61 | 5.3 |  | Y | 469/224/693 | Hover thrust to weight 1.3:1 is too low: a VTOL needs about 1.6:1 or more to hover safely, and more in wind. |
| 4s2p-li | 2814-700 | 10x5 | 14.8 | 875.8 | 1663 | 1.58 | 0.796 | 63.2 | 14.86 | 25.84 | 72.35 | 5.3 |  | Y | 469/227/696 | Hover thrust to weight 1.6:1 is too low: a VTOL needs about 1.6:1 or more to hover safely, and more in wind. |
| 4s2p-li | 2814-700 | 7x4 | 14.8 | 437.9 | 1645 | 0.799 | 1 | 40.2 | 18.68 | 20.56 | 73.14 | 5.2 |  | Y | 469/218/687 | Hover thrust to weight 0.8:1 is too low: a VTOL needs about 1.6:1 or more to hover safely, and more in wind. |
| 4s2p-li | 2306-2400 | 9x5 | 14.8 | 2600 | 1468 | 5.313 | 0.434 | 202.7 | 14.17 | 27.1 | 81.96 | 4.7 | Y |  | 415/224/639 | 2306 2400KV (racing) is a racing motor: on 9-inch props it overheats in seconds. VTOL lift motors are big, low-KV (700-1000 KV). |
| 4s2p-li | 2306-2400 | 10x5 | 14.8 | 2600 | 1474 | 5.292 | 0.435 | 187.7 | 13.17 | 29.15 | 81.63 | 4.7 | Y |  | 415/227/642 | 2306 2400KV (racing) is a racing motor: on 9-inch props it overheats in seconds. VTOL lift motors are big, low-KV (700-1000 KV). |
| 4s2p-li | 2306-2400 | 7x4 | 14.8 | 2600 | 1456 | 5.357 | 0.432 | 238.5 | 16.53 | 23.22 | 82.64 | 4.6 | Y |  | 415/218/633 | 2306 2400KV (racing) is a racing motor: on 9-inch props it overheats in seconds. VTOL lift motors are big, low-KV (700-1000 KV). |
| 4s-5000 | 2810-1000 | 9x5 | 14.8 | 1489.5 | 1545 | 2.892 | 0.588 | 116.1 | 14.91 | 16.09 | 48.67 | 4.9 |  |  | 430/224/654 | Parts match. Cruise draws about 5 A against 15 A in hover: the wing does the work. Freestyle time below = cruise time. |
| 4s-5000 | 2810-1000 | 10x5 | 14.8 | 1787.4 | 1551 | 3.457 | 0.538 | 129 | 13.86 | 17.31 | 48.49 | 4.9 |  |  | 430/227/657 | Parts match. Cruise draws about 5 A against 14 A in hover: the wing does the work. Freestyle time below = cruise time. |
| 4s-5000 | 2810-1000 | 7x4 | 14.8 | 893.7 | 1533 | 1.749 | 0.756 | 82 | 17.41 | 13.79 | 49.05 | 4.9 |  |  | 430/218/648 | Parts match. Cruise draws about 5 A against 17 A in hover: the wing does the work. Freestyle time below = cruise time. |
| 4s-5000 | 2814-700 | 9x5 | 14.8 | 729.8 | 1617 | 1.354 | 0.859 | 56.9 | 15.61 | 15.38 | 46.51 | 5.2 |  | Y | 454/224/678 | Hover thrust to weight 1.4:1 is too low: a VTOL needs about 1.6:1 or more to hover safely, and more in wind. |
| 4s-5000 | 2814-700 | 10x5 | 14.8 | 875.8 | 1623 | 1.619 | 0.786 | 63.2 | 14.51 | 16.55 | 46.33 | 5.2 |  |  | 454/227/681 | Parts match. Cruise draws about 5 A against 15 A in hover: the wing does the work. Freestyle time below = cruise time. |
| 4s-5000 | 2814-700 | 7x4 | 14.8 | 437.9 | 1605 | 0.819 | 1 | 40.2 | 18.23 | 13.17 | 46.85 | 5.1 |  | Y | 454/218/672 | Hover thrust to weight 0.8:1 is too low: a VTOL needs about 1.6:1 or more to hover safely, and more in wind. |
| 4s-5000 | 2306-2400 | 9x5 | 14.8 | 2600 | 1428 | 5.462 | 0.428 | 202.7 | 13.78 | 17.41 | 52.66 | 4.6 | Y |  | 400/224/624 | 2306 2400KV (racing) is a racing motor: on 9-inch props it overheats in seconds. VTOL lift motors are big, low-KV (700-1000 KV). |
| 4s-5000 | 2306-2400 | 10x5 | 14.8 | 2600 | 1434 | 5.439 | 0.429 | 187.7 | 12.82 | 18.73 | 52.44 | 4.6 | Y |  | 400/227/627 | 2306 2400KV (racing) is a racing motor: on 9-inch props it overheats in seconds. VTOL lift motors are big, low-KV (700-1000 KV). |
| 4s-5000 | 2306-2400 | 7x4 | 14.8 | 2600 | 1416 | 5.508 | 0.426 | 238.5 | 16.08 | 14.93 | 53.11 | 4.5 | Y |  | 400/218/618 | 2306 2400KV (racing) is a racing motor: on 9-inch props it overheats in seconds. VTOL lift motors are big, low-KV (700-1000 KV). |
| 6s-4000 | 2810-1000 | 9x5 | 22.2 | 2600 | 1625 | 4.8 | 0.456 | 135.1 | 10.46 | 18.36 | 55.53 | 3.5 | Y |  | 450/224/674 | 2810 1000KV is a racing motor: on 9-inch props it overheats in seconds. VTOL lift motors are big, low-KV (700-1000 KV). |
| 6s-4000 | 2810-1000 | 10x5 | 22.2 | 2600 | 1631 | 4.782 | 0.457 | 125.1 | 9.72 | 19.76 | 55.33 | 3.5 | Y |  | 450/227/677 | 2810 1000KV is a racing motor: on 9-inch props it overheats in seconds. VTOL lift motors are big, low-KV (700-1000 KV). |
| 6s-4000 | 2810-1000 | 7x4 | 22.2 | 2010.8 | 1613 | 3.74 | 0.517 | 123 | 12.21 | 15.72 | 55.95 | 3.4 | Y |  | 450/218/668 | 2810 1000KV is a racing motor: on 9-inch props it overheats in seconds. VTOL lift motors are big, low-KV (700-1000 KV). |
| 6s-4000 | 2814-700 | 9x5 | 22.2 | 1642.1 | 1697 | 2.903 | 0.587 | 85.4 | 10.92 | 17.58 | 53.18 | 3.6 |  |  | 474/224/698 | Parts match. Cruise draws about 4 A against 11 A in hover: the wing does the work. Freestyle time below = cruise time. |
| 6s-4000 | 2814-700 | 10x5 | 22.2 | 1970.6 | 1703 | 3.471 | 0.537 | 94.8 | 10.15 | 18.92 | 52.99 | 3.6 |  |  | 474/227/701 | Parts match. Cruise draws about 4 A against 10 A in hover: the wing does the work. Freestyle time below = cruise time. |
| 6s-4000 | 2814-700 | 7x4 | 22.2 | 985.3 | 1685 | 1.754 | 0.755 | 60.2 | 12.76 | 15.05 | 53.56 | 3.6 |  |  | 474/218/692 | Parts match. Cruise draws about 4 A against 13 A in hover: the wing does the work. Freestyle time below = cruise time. |
| 6s-4000 | 2306-2400 | 9x5 | 22.2 | 2600 | 1508 | 5.172 | 0.44 | 135.1 | 9.7 | 19.79 | 59.84 | 3.2 | Y |  | 420/224/644 | 2306 2400KV (racing) is a racing motor: on 9-inch props it overheats in seconds. VTOL lift motors are big, low-KV (700-1000 KV). |
| 6s-4000 | 2306-2400 | 10x5 | 22.2 | 2600 | 1514 | 5.152 | 0.441 | 125.1 | 9.02 | 21.28 | 59.6 | 3.2 | Y |  | 420/227/647 | 2306 2400KV (racing) is a racing motor: on 9-inch props it overheats in seconds. VTOL lift motors are big, low-KV (700-1000 KV). |
| 6s-4000 | 2306-2400 | 7x4 | 22.2 | 2600 | 1496 | 5.214 | 0.438 | 159 | 11.33 | 16.95 | 60.32 | 3.2 | Y |  | 420/218/638 | 2306 2400KV (racing) is a racing motor: on 9-inch props it overheats in seconds. VTOL lift motors are big, low-KV (700-1000 KV). |

## Fig 11 Crazyflie swarm (`swarm`)

Default design: battery `1s250`, motor `7x16`, prop `45mm` (marked **bold**).

| batt | motor | prop | V | thrust g/motor | AUW g | T:W | hover thr | max A | hover A | hover min | fly min | over | weak | cost E/M/total | verdict shown |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **1s250** | **7x16** | **45mm** | **3.7** | **13.4** | **28.4** | **1.887** | **0.728** | **4.8** | **1.74** | **6.88** | **6.33** |  |  | **379/9/388** | **Stock-like build: about 1.9:1, enough margin to fly a tight formation indoors.** |
| 1s250 | 7x16 | 47mm | 3.7 | 15 | 28.6 | 2.099 | 0.69 | 5.4 | 1.89 | 6.35 | 5.84 |  |  | 379/11/390 | Stock-like build: about 2.1:1, enough margin to fly a tight formation indoors. |
| 1s250 | 7x16hp | 45mm | 3.7 | 16.4 | 28.8 | 2.281 | 0.662 | 5.9 | 1.77 | 6.78 | 6.24 |  |  | 387/9/396 | Stock-like build: about 2.3:1, enough margin to fly a tight formation indoors. |
| 1s250 | 7x16hp | 47mm | 3.7 | 18.4 | 29 | 2.537 | 0.628 | 6.6 | 1.92 | 6.26 | 5.76 |  |  | 387/11/398 | Stock-like build: about 2.5:1, enough margin to fly a tight formation indoors. |
| 1s250 | 8x20 | 45mm | 3.7 | 10.7 | 35.6 | 1.2 | 0.913 | 3.8 | 2.19 | 5.49 | 5.05 | Y | Y | 387/9/396 | 8 x 20 mm motors don't fit the 7 mm mounts, and they draw more than the board's MOSFETs are rated for. Stay with 7 x 16. Thrust to weight... |
| 1s250 | 8x20 | 47mm | 3.7 | 12 | 35.8 | 1.337 | 0.865 | 4.3 | 2.36 | 5.07 | 4.67 | Y | Y | 387/11/398 | 8 x 20 mm motors don't fit the 7 mm mounts, and they draw more than the board's MOSFETs are rated for. Stay with 7 x 16. Thrust to weight... |
| 1s350 | 7x16 | 45mm | 3.7 | 13.4 | 30.9 | 1.735 | 0.759 | 4.8 | 1.9 | 8.85 | 8.14 |  |  | 381/9/390 | Stock-like build: about 1.7:1, enough margin to fly a tight formation indoors. |
| 1s350 | 7x16 | 47mm | 3.7 | 15 | 31.1 | 1.93 | 0.72 | 5.4 | 2.05 | 8.18 | 7.52 |  |  | 381/11/392 | Stock-like build: about 1.9:1, enough margin to fly a tight formation indoors. |
| 1s350 | 7x16hp | 45mm | 3.7 | 16.4 | 31.3 | 2.099 | 0.69 | 5.9 | 1.92 | 8.74 | 8.04 |  |  | 389/9/398 | Stock-like build: about 2.1:1, enough margin to fly a tight formation indoors. |
| 1s350 | 7x16hp | 47mm | 3.7 | 18.4 | 31.5 | 2.336 | 0.654 | 6.6 | 2.08 | 8.07 | 7.43 |  |  | 389/11/400 | Stock-like build: about 2.3:1, enough margin to fly a tight formation indoors. |
| 1s350 | 8x20 | 45mm | 3.7 | 10.7 | 38.1 | 1.122 | 0.944 | 3.8 | 2.34 | 7.18 | 6.6 | Y | Y | 389/9/398 | 8 x 20 mm motors don't fit the 7 mm mounts, and they draw more than the board's MOSFETs are rated for. Stay with 7 x 16. Thrust to weight... |
| 1s350 | 8x20 | 47mm | 3.7 | 12 | 38.3 | 1.25 | 0.895 | 4.3 | 2.53 | 6.64 | 6.11 | Y | Y | 389/11/400 | 8 x 20 mm motors don't fit the 7 mm mounts, and they draw more than the board's MOSFETs are rated for. Stay with 7 x 16. Thrust to weight... |
| 1s450 | 7x16 | 45mm | 3.7 | 13.4 | 33.8 | 1.586 | 0.794 | 4.8 | 2.08 | 10.4 | 9.57 |  | Y | 382/9/391 | Thrust to weight 1.6:1: the 450 mAh cell is too heavy. It hovers at full throttle with nothing left to correct, so it drifts and can't ho... |
| 1s450 | 7x16 | 47mm | 3.7 | 15 | 34 | 1.766 | 0.753 | 5.4 | 2.25 | 9.62 | 8.85 |  |  | 382/11/393 | Stock-like build: about 1.8:1, enough margin to fly a tight formation indoors. |
| 1s450 | 7x16hp | 45mm | 3.7 | 16.4 | 34.2 | 1.921 | 0.721 | 5.9 | 2.1 | 10.28 | 9.46 |  |  | 390/9/399 | Stock-like build: about 1.9:1, enough margin to fly a tight formation indoors. |
| 1s450 | 7x16hp | 47mm | 3.7 | 18.4 | 34.4 | 2.139 | 0.684 | 6.6 | 2.27 | 9.51 | 8.75 |  |  | 390/11/401 | Stock-like build: about 2.1:1, enough margin to fly a tight formation indoors. |
| 1s450 | 8x20 | 45mm | 3.7 | 10.7 | 41 | 1.042 | 0.98 | 3.8 | 2.52 | 8.58 | 7.89 | Y | Y | 390/9/399 | 8 x 20 mm motors don't fit the 7 mm mounts, and they draw more than the board's MOSFETs are rated for. Stay with 7 x 16. Thrust to weight... |
| 1s450 | 8x20 | 47mm | 3.7 | 12 | 41.2 | 1.162 | 0.928 | 4.3 | 2.72 | 7.94 | 7.3 | Y | Y | 390/11/401 | 8 x 20 mm motors don't fit the 7 mm mounts, and they draw more than the board's MOSFETs are rated for. Stay with 7 x 16. Thrust to weight... |

## Fig 12 Tricopter (`tricopter`)

Default design: battery `4s2200`, motor `2306-2450`, prop `5x4.3x3` (marked **bold**).

| batt | motor | prop | V | thrust g/motor | AUW g | T:W | hover thr | max A | hover A | hover min | fly min | over | weak | cost E/M/total | verdict shown |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **4s2200** | **2306-2450** | **5x4.3x3** | **14.8** | **1117.6** | **655.2** | **5.117** | **0.442** | **113.3** | **6.51** | **16.22** | **6.81** |  |  | **242/78/320** | **OK Good all-round build.** |
| 4s2200 | 2306-2450 | 6x4x2 | 14.8 | 1207 | 657 | 5.511 | 0.426 | 106.4 | 5.68 | 18.6 | 7.81 |  |  | 242/78/320 | OK Good all-round build. |
| 4s2200 | 2306-2450 | 5x5x3 | 14.8 | 1229.3 | 656.4 | 5.618 | 0.422 | 141.6 | 7.41 | 14.25 | 5.98 |  |  | 242/78/320 | OK Good all-round build. |
| 4s2200 | 2207-2150 | 5x4.3x3 | 14.8 | 860.6 | 661.2 | 3.905 | 0.506 | 87.2 | 6.57 | 16.07 | 6.75 |  |  | 248/78/326 | OK Good all-round build. |
| 4s2200 | 2207-2150 | 6x4x2 | 14.8 | 929.5 | 663 | 4.206 | 0.488 | 81.9 | 5.73 | 18.43 | 7.74 |  |  | 248/78/326 | OK Good all-round build. |
| 4s2200 | 2207-2150 | 5x5x3 | 14.8 | 946.7 | 662.4 | 4.288 | 0.483 | 109 | 7.48 | 14.12 | 5.93 |  |  | 248/78/326 | OK Good all-round build. |
| 4s2200 | 2205-2300 | 5x4.3x3 | 14.8 | 984.9 | 643.2 | 4.594 | 0.467 | 99.8 | 6.39 | 16.52 | 6.94 |  |  | 230/78/308 | OK Good all-round build. |
| 4s2200 | 2205-2300 | 6x4x2 | 14.8 | 1063.7 | 645 | 4.947 | 0.45 | 93.7 | 5.57 | 18.95 | 7.96 |  |  | 230/78/308 | OK Good all-round build. |
| 4s2200 | 2205-2300 | 5x5x3 | 14.8 | 1083.4 | 644.4 | 5.044 | 0.445 | 124.8 | 7.28 | 14.51 | 6.1 |  |  | 230/78/308 | OK Good all-round build. |
| 4s1800 | 2306-2450 | 5x4.3x3 | 14.8 | 1117.6 | 615.2 | 5.45 | 0.428 | 113.3 | 6.11 | 14.13 | 5.94 |  |  | 238/78/316 | OK Good all-round build. |
| 4s1800 | 2306-2450 | 6x4x2 | 14.8 | 1207 | 617 | 5.869 | 0.413 | 106.4 | 5.33 | 16.21 | 6.81 |  |  | 238/78/316 | OK Good all-round build. |
| 4s1800 | 2306-2450 | 5x5x3 | 14.8 | 1229.3 | 616.4 | 5.983 | 0.409 | 141.6 | 6.96 | 12.41 | 5.21 |  |  | 238/78/316 | OK Good all-round build. |
| 4s1800 | 2207-2150 | 5x4.3x3 | 14.8 | 860.6 | 621.2 | 4.156 | 0.491 | 87.2 | 6.17 | 14 | 5.88 |  |  | 244/78/322 | OK Good all-round build. |
| 4s1800 | 2207-2150 | 6x4x2 | 14.8 | 929.5 | 623 | 4.476 | 0.473 | 81.9 | 5.38 | 16.05 | 6.74 |  |  | 244/78/322 | OK Good all-round build. |
| 4s1800 | 2207-2150 | 5x5x3 | 14.8 | 946.7 | 622.4 | 4.563 | 0.468 | 109 | 7.03 | 12.29 | 5.16 |  |  | 244/78/322 | OK Good all-round build. |
| 4s1800 | 2205-2300 | 5x4.3x3 | 14.8 | 984.9 | 603.2 | 4.898 | 0.452 | 99.8 | 5.99 | 14.42 | 6.05 |  |  | 226/78/304 | OK Good all-round build. |
| 4s1800 | 2205-2300 | 6x4x2 | 14.8 | 1063.7 | 605 | 5.275 | 0.435 | 93.7 | 5.23 | 16.53 | 6.94 |  |  | 226/78/304 | OK Good all-round build. |
| 4s1800 | 2205-2300 | 5x5x3 | 14.8 | 1083.4 | 604.4 | 5.378 | 0.431 | 124.8 | 6.82 | 12.66 | 5.32 |  |  | 226/78/304 | OK Good all-round build. |
| 4s1500 | 2306-2450 | 5x4.3x3 | 14.8 | 1117.6 | 587.2 | 5.71 | 0.418 | 113.3 | 5.83 | 12.34 | 5.18 |  |  | 236/78/314 | OK Good all-round build. |
| 4s1500 | 2306-2450 | 6x4x2 | 14.8 | 1207 | 589 | 6.148 | 0.403 | 106.4 | 5.09 | 14.15 | 5.94 |  |  | 236/78/314 | OK Good all-round build. |
| 4s1500 | 2306-2450 | 5x5x3 | 14.8 | 1229.3 | 588.4 | 6.268 | 0.399 | 141.6 | 6.64 | 10.84 | 4.55 |  |  | 236/78/314 | OK Good all-round build. |
| 4s1500 | 2207-2150 | 5x4.3x3 | 14.8 | 860.6 | 593.2 | 4.353 | 0.479 | 87.2 | 5.89 | 12.22 | 5.13 |  |  | 242/78/320 | OK Good all-round build. |
| 4s1500 | 2207-2150 | 6x4x2 | 14.8 | 929.5 | 595 | 4.686 | 0.462 | 81.9 | 5.14 | 14.01 | 5.88 |  |  | 242/78/320 | OK Good all-round build. |
| 4s1500 | 2207-2150 | 5x5x3 | 14.8 | 946.7 | 594.4 | 4.778 | 0.457 | 109 | 6.71 | 10.73 | 4.51 |  |  | 242/78/320 | OK Good all-round build. |
| 4s1500 | 2205-2300 | 5x4.3x3 | 14.8 | 984.9 | 575.2 | 5.137 | 0.441 | 99.8 | 5.72 | 12.6 | 5.29 |  |  | 224/78/302 | OK Good all-round build. |
| 4s1500 | 2205-2300 | 6x4x2 | 14.8 | 1063.7 | 577 | 5.531 | 0.425 | 93.7 | 4.99 | 14.44 | 6.07 |  |  | 224/78/302 | OK Good all-round build. |
| 4s1500 | 2205-2300 | 5x5x3 | 14.8 | 1083.4 | 576.4 | 5.639 | 0.421 | 124.8 | 6.51 | 11.06 | 4.65 |  |  | 224/78/302 | OK Good all-round build. |

## Fig 13 Heavy-lift octocopter (`octo`)

Default design: battery `12s16000`, motor `6010-170`, prop `2055` (marked **bold**).

| batt | motor | prop | V | thrust g/motor | AUW g | T:W | hover thr | max A | hover A | hover min | fly min | over | weak | cost E/M/total | verdict shown |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 12s16000 | 6010-170 | 1855 | 44.4 | 3510.6 | 15406 | 1.823 | 0.741 | 160.2 | 38.86 | 19.77 | 15.42 |  |  | 4560/1870/6430 | Parts match: 15.4 kg all-up, enough margin to lose a motor and still land. |
| **12s16000** | **6010-170** | **2055** | **44.4** | **4500.8** | **15486** | **2.325** | **0.656** | **193.1** | **36.71** | **20.92** | **16.32** |  |  | **4560/1990/6550** | **Parts match: 15.5 kg all-up, enough margin to lose a motor and still land.** |
| 12s16000 | 6010-170 | 2255 | 44.4 | 5491 | 15582 | 2.819 | 0.596 | 222.2 | 34.85 | 22.04 | 17.19 |  |  | 4560/2110/6670 | 22" props are 558 mm wide, but neighbouring motors are only 520 mm apart: the props would hit each other. Shorter props or longer arms. |
| 12s16000 | 6010-130 | 1855 | 44.4 | 2052.9 | 15406 | 1.066 | 0.969 | 93.7 | 38.86 | 19.77 | 15.42 |  | Y | 4560/1870/6430 | Thrust to weight 1.1:1: it can't hold 15.4 kg with any margin. Heavy lift needs 2:1, and these motors need 12S to make it. |
| 12s16000 | 6010-130 | 2055 | 44.4 | 2632 | 15486 | 1.36 | 0.858 | 112.9 | 36.71 | 20.92 | 16.32 |  | Y | 4560/1990/6550 | Thrust to weight 1.4:1: it can't hold 15.5 kg with any margin. Heavy lift needs 2:1, and these motors need 12S to make it. |
| 12s16000 | 6010-130 | 2255 | 44.4 | 3211 | 15582 | 1.649 | 0.779 | 130 | 34.85 | 22.04 | 17.19 |  | Y | 4560/2110/6670 | Thrust to weight 1.6:1: it can't hold 15.6 kg with any margin. Heavy lift needs 2:1, and these motors need 12S to make it. 22" props are ... |
| 12s16000 | 6215-230 | 1855 | 44.4 | 6426 | 16006 | 3.212 | 0.558 | 293.3 | 40.37 | 19.02 | 14.84 | Y |  | 4880/1870/6750 | 230 KV on 12S spins 18" props far too fast: the motors and ESCs overheat and one will desync mid-air. |
| 12s16000 | 6215-230 | 2055 | 44.4 | 8238.5 | 16086 | 4.097 | 0.494 | 353.4 | 38.14 | 20.14 | 15.71 | Y |  | 4880/1990/6870 | 230 KV on 12S spins 20" props far too fast: the motors and ESCs overheat and one will desync mid-air. |
| 12s16000 | 6215-230 | 2255 | 44.4 | 10051 | 16182 | 4.969 | 0.449 | 406.8 | 36.19 | 21.22 | 16.55 | Y |  | 4880/2110/6990 | 230 KV on 12S spins 22" props far too fast: the motors and ESCs overheat and one will desync mid-air. 22" props are 558 mm wide, but neig... |
| 12s22000 | 6010-170 | 1855 | 44.4 | 3510.6 | 16906 | 1.661 | 0.776 | 160.2 | 42.64 | 24.77 | 19.32 |  | Y | 4740/1870/6610 | Thrust to weight 1.7:1: it can't hold 16.9 kg with any margin. Heavy lift needs 2:1, and these motors need 12S to make it. |
| 12s22000 | 6010-170 | 2055 | 44.4 | 4500.8 | 16986 | 2.12 | 0.687 | 193.1 | 40.27 | 26.22 | 20.45 |  |  | 4740/1990/6730 | Parts match: 17.0 kg all-up, enough margin to lose a motor and still land. |
| 12s22000 | 6010-170 | 2255 | 44.4 | 5491 | 17082 | 2.572 | 0.624 | 222.2 | 38.21 | 27.64 | 21.56 |  |  | 4740/2110/6850 | 22" props are 558 mm wide, but neighbouring motors are only 520 mm apart: the props would hit each other. Shorter props or longer arms. |
| 12s22000 | 6010-130 | 1855 | 44.4 | 2052.9 | 16906 | 0.971 | 1.015 | 93.7 | 42.64 | 24.77 | 19.32 |  | Y | 4740/1870/6610 | Thrust to weight 1.0:1: it can't hold 16.9 kg with any margin. Heavy lift needs 2:1, and these motors need 12S to make it. |
| 12s22000 | 6010-130 | 2055 | 44.4 | 2632 | 16986 | 1.24 | 0.898 | 112.9 | 40.27 | 26.22 | 20.45 |  | Y | 4740/1990/6730 | Thrust to weight 1.2:1: it can't hold 17.0 kg with any margin. Heavy lift needs 2:1, and these motors need 12S to make it. |
| 12s22000 | 6010-130 | 2255 | 44.4 | 3211 | 17082 | 1.504 | 0.815 | 130 | 38.21 | 27.64 | 21.56 |  | Y | 4740/2110/6850 | Thrust to weight 1.5:1: it can't hold 17.1 kg with any margin. Heavy lift needs 2:1, and these motors need 12S to make it. 22" props are ... |
| 12s22000 | 6215-230 | 1855 | 44.4 | 6426 | 17506 | 2.937 | 0.584 | 293.3 | 44.15 | 23.92 | 18.66 | Y |  | 5060/1870/6930 | 230 KV on 12S spins 18" props far too fast: the motors and ESCs overheat and one will desync mid-air. |
| 12s22000 | 6215-230 | 2055 | 44.4 | 8238.5 | 17586 | 3.748 | 0.517 | 353.4 | 41.69 | 25.33 | 19.76 | Y |  | 5060/1990/7050 | 230 KV on 12S spins 20" props far too fast: the motors and ESCs overheat and one will desync mid-air. |
| 12s22000 | 6215-230 | 2255 | 44.4 | 10051 | 17682 | 4.547 | 0.469 | 406.8 | 39.55 | 26.7 | 20.83 | Y |  | 5060/2110/7170 | 230 KV on 12S spins 22" props far too fast: the motors and ESCs overheat and one will desync mid-air. 22" props are 558 mm wide, but neig... |
| 6s16000 | 6010-170 | 1855 | 22.2 | 877.7 | 13456 | 0.522 | 1.384 | 80.1 | 67.88 | 11.31 | 8.83 |  | Y | 4270/1870/6140 | Thrust to weight 0.5:1: it can't hold 13.5 kg with any margin. Heavy lift needs 2:1, and these motors need 12S to make it. |
| 6s16000 | 6010-170 | 2055 | 22.2 | 1125.2 | 13536 | 0.665 | 1.226 | 96.5 | 64.18 | 11.97 | 9.33 |  | Y | 4270/1990/6260 | Thrust to weight 0.7:1: it can't hold 13.5 kg with any margin. Heavy lift needs 2:1, and these motors need 12S to make it. |
| 6s16000 | 6010-170 | 2255 | 22.2 | 1372.7 | 13632 | 0.806 | 1.114 | 111.1 | 60.98 | 12.59 | 9.82 |  | Y | 4270/2110/6380 | Thrust to weight 0.8:1: it can't hold 13.6 kg with any margin. Heavy lift needs 2:1, and these motors need 12S to make it. 22" props are ... |
| 6s16000 | 6010-130 | 1855 | 22.2 | 513.2 | 13456 | 0.305 | 1.81 | 46.8 | 67.88 | 11.31 | 8.83 |  | Y | 4270/1870/6140 | Thrust to weight 0.3:1: it can't hold 13.5 kg with any margin. Heavy lift needs 2:1, and these motors need 12S to make it. |
| 6s16000 | 6010-130 | 2055 | 22.2 | 658 | 13536 | 0.389 | 1.604 | 56.5 | 64.18 | 11.97 | 9.33 |  | Y | 4270/1990/6260 | Thrust to weight 0.4:1: it can't hold 13.5 kg with any margin. Heavy lift needs 2:1, and these motors need 12S to make it. |
| 6s16000 | 6010-130 | 2255 | 22.2 | 802.7 | 13632 | 0.471 | 1.457 | 65 | 60.98 | 12.59 | 9.82 |  | Y | 4270/2110/6380 | Thrust to weight 0.5:1: it can't hold 13.6 kg with any margin. Heavy lift needs 2:1, and these motors need 12S to make it. 22" props are ... |
| 6s16000 | 6215-230 | 1855 | 22.2 | 1606.5 | 14056 | 0.914 | 1.046 | 146.6 | 70.9 | 10.83 | 8.45 |  | Y | 4590/1870/6460 | Thrust to weight 0.9:1: it can't hold 14.1 kg with any margin. Heavy lift needs 2:1, and these motors need 12S to make it. |
| 6s16000 | 6215-230 | 2055 | 22.2 | 2059.6 | 14136 | 1.166 | 0.926 | 176.7 | 67.03 | 11.46 | 8.94 |  | Y | 4590/1990/6580 | Thrust to weight 1.2:1: it can't hold 14.1 kg with any margin. Heavy lift needs 2:1, and these motors need 12S to make it. |
| 6s16000 | 6215-230 | 2255 | 22.2 | 2512.7 | 14232 | 1.412 | 0.841 | 203.4 | 63.66 | 12.06 | 9.41 |  | Y | 4590/2110/6700 | Thrust to weight 1.4:1: it can't hold 14.2 kg with any margin. Heavy lift needs 2:1, and these motors need 12S to make it. 22" props are ... |
