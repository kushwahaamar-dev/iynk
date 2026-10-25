# Fig. P1 — Breadboard (Colorfigures prompt)

Make a colourful, hand-inked isometric figure of an empty **half-size solderless breadboard** lying on a pale green
cutting mat with a 10 mm grid (`figures/parts/breadboard.js`, drawn by the Board Bench engine; every lesson circuit
stands on it).

- An off-white block, 82.5 x 54.5 x 8.5 mm, with a shallow grey channel down the middle.
- 30 columns of square 2.54 mm holes in two halves: rows a-e on one side of the channel, f-j on the other, 7.62 mm
  apart across it. Grey silk letters a-j at the end of each row and column numbers 1, 5, 10 … 30.
- Two power rails along each long edge, 25 holes each in groups of five, marked with a red line and "+" and a blue
  line and "−".
- Engine sizes the lessons use: half (this one), full (63 columns) and mini (17 columns, no rails).

What it does:

- It has no pickers: it is the reference for how holes connect. Each column's five holes on one side of the channel
  are one node, and each rail is one node, which is how the breadboard solver reads every circuit placed on it.
  Holes are named a1 … j30, and T+, T-, B+, B- with a column for the rail hole nearest that column.
- **Labels** and **See-through** change nothing on the empty board.

Look: warm paper, heavy ink outline with finer inner lines, flat light/mid/dark bands, mustard accent, the five
Colorfigures palettes.
