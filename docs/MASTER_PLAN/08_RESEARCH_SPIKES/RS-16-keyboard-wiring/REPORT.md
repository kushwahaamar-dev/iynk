# RS-16: can a person place and wire without a pointer

Task T-B4-18. Spike. No product file changed. Prototype in `proto/` (plain HTML and one script).

## Verdict

PASS for the keyboard half. The scripted run needed 16 key presses (resistor already on the board) or 20 (resistor placed too), against a bound of 40. No step needed a pointer, every focus stop was reachable by Tab or arrow keys, and the smallest target was 32 px high (the pin picker items are 44 px high). The screen-reader half is INCONCLUSIVE: an agent cannot run it. It stays For Amar (Q-13).

## Question

Can a person place an LED, wire it to Uno D13 and edit a resistor value using only a keyboard in 40 key presses or fewer, with every target at least 24 by 24 CSS px, using a list-based path (palette, PinPicker, inspector field)?

## Why it matters

R-058 (wiring without a pointer) and RC-67 ask for this to be measured before the real keyboard path (T-B4-19) is built. The design (UX 10.1 to 10.3: palette Enter, `W` then PinPicker) was binding but never tried. The press count is also the number T-B4-19 and T-B4-20 test against (FA-12, under 40).

## Exit condition

From the card. PASS: a scripted Playwright run on a throwaway prototype completes the circuit in at most 40 key presses, counted by a `keydown` listener (every keydown counts, including each typed character in a search box, Tab, Enter, arrows and a modifier's own keydown), with every focus stop reachable by Tab or arrow keys and every target at least 24 by 24 px. FAIL: more than 40 presses, or any step needs a pointer. INCONCLUSIVE: the screen-reader half.

The circuit: place an LED, make one wire to Uno D13, edit a resistor value.

## Environment

| Item | Value |
|---|---|
| Machine | Apple M4 Pro, macOS (Darwin 27.0.0) |
| Browser | Chromium from the repo's installed Playwright 1.64.0, headless |
| axe-core | 4.14.0, from the repo's `node_modules` |
| Page | `proto/index.html` opened from disk (`file://`), 1280 by 720 default viewport |
| Pointer | never used: the script only calls `keyboard.press` |

## Method

The prototype has: a fixed 8-part catalog (LED, Resistor, Push button, Buzzer, Potentiometer, Servo, Capacitor, Diode), a search box with a listbox (`aria-activedescendant`), a Circuit list of placed parts (roving tabindex, Up and Down move the selection), an inspector with one Value field, a modal PinPicker (search box plus a list of pin buttons, 44 px high), and a polite live region. The Arduino Uno `U1` is on the board from the start.

Keys in the prototype:

| Key | Where | Effect |
|---|---|---|
| `/` | anywhere outside a text field | focus the part search |
| typing, Enter | part search | filter the catalog; Enter places the active item at once and focuses it in the Circuit list |
| `W` | a part selected | open the PinPicker with the "from" end already set to the part's first free pin (LED1 anode) |
| typing, Enter | PinPicker search | filter pins; Enter wires to the first match and returns focus to the part |
| Up, Down | Circuit list | move the selection |
| Enter | a selected part | focus the Value field with its text selected |
| Enter | Value field | commit the value, return focus to the part |

A capture-phase `keydown` listener on `window` counts every key event. Two scripted runs, each repeated 15 times after the fix described under "Finding"; the result was the same each time:

- A: resistor R1 already on the board (placed before the counter starts). Presses: `/`, `led`, Enter (place LED1); `W`, `d13`, Enter (wire LED1 anode to U1 D13); ArrowUp (select R1), Enter (open the field), `330`, Enter (commit).
- B: as A, but R1 is placed inside the counted run: `/`, `res`, Enter instead of the ArrowUp.

The focus start is the page body. axe-core ran on the page, and again with the PinPicker open. Bounding boxes of every visible `input`, `button` and `option` were read in both states. A separate pass pressed Tab from the body to list the focus stops.

## Results

### Key presses

| Step | Presses (A) | Presses (B) |
|---|---|---|
| `/` to focus the search | 1 | 1 |
| type `led` | 3 | 3 |
| Enter: LED1 placed and focused | 1 | 1 |
| `W`: PinPicker opens, from = LED1 anode | 1 | 1 |
| type `d13` | 3 | 3 |
| Enter: wire made | 1 | 1 |
| select R1: ArrowUp (A) or `/`, `res`, Enter (B) | 1 | 5 |
| Enter: focus the Value field | 1 | 1 |
| type `330` | 3 | 3 |
| Enter: value committed | 1 | 1 |
| Total | 16 | 20 |

End state in both runs: one wire (LED1 anode to U1 D13), R1 value 330. The live region said "Wire made between LED1 anode and U1 D13", then "R1 value set to 330".

Without the preset "from" end the wire needs the first end picked as well. Not measured; typing a second pin name and one more Enter would add about 5 presses (estimated), which still fits under 40.

### Targets

98 visible controls measured across the main page and the open picker. Smallest: 240 by 32 px (the search and value boxes and the list rows). None under 24 by 24. Picker items are 44 px high. These are prototype boxes in a 1280 px page, not the real tool's.

### Focus stops

Tab from the body visits, in order: part search, the selected part in the Circuit list, the Value field (when a part is selected), then leaves the page. The other parts are reached with Up and Down (roving tabindex), the catalog items with Up and Down in the search box, the pin items with Down from the picker search or by typing. Every control is reachable without a pointer. Escape closes the picker (the dialog's own behaviour).

### axe

| State | Violations | Passes |
|---|---|---|
| Main page | 1: `page-has-heading-one` (the prototype has no `h1`; not a finding about the pattern) | 34 |
| PinPicker open | 0 | 24 |

axe cannot judge whether the announcements make sense. That is the screen-reader half.

## Verdict

PASS (keyboard half). 16 presses for the card's circuit with R1 on the board, 20 if R1 is placed in the same run. INCONCLUSIVE (screen reader), For Amar, Q-13.

## What T-B4-19 must copy

1. `W` with a part selected opens the picker with the "from" end preset to the part's first free pin. This is what keeps a wire to 1 + up to 4 typed characters + 1. Without it the count rises. The shortcut the T-B4-19 card says to add on a FAIL is already the plan, so it goes in from the start.
2. Enter in the part search places the active result and moves focus to the new part. No Tab is needed between placing and wiring.
3. The picker search matches on a pin's short name (`d13`), and Enter picks the first match. Pin labels must stay unique enough that three or four characters find one pin; if two boards both have a D13, the first match is a guess, so the picker should show the board in each row and the live region should say which one was wired.
4. Enter on a selected part focuses the first inspector field with its text selected, so the typed value replaces the old one. Enter commits and returns focus to the part.
5. Focus returns to the part after every commit, so the next key lands on the canvas list and not on the body.
6. The roving tabindex in the part list (one Tab stop, arrows inside) keeps the Tab count low.
7. Count rule: the press count uses the T-B4-19 definition (every keydown). The press totals here are the numbers T-B4-19 and T-B4-20 can start from. They are a lower bound for the real tool (see Caveats). The full blink circuit budget (`FULL_BLINK_PRESS_BUDGET`) is not set by this task.

## Finding: restore focus synchronously

The first version of the prototype restored focus to the part in the dialog's `close` event. That event fires after the keydown that closed the dialog, so with fast typing the late `focus()` call ran after the next keys had moved focus to the Value field. In 1 of 5 runs the `330` was typed into the part list and the value stayed 220; after the change (focus restored by the commit itself, and in the `cancel` event for Escape) 15 of 15 runs were correct. The real PinPicker must move focus in the same handler that commits, not in a close or transition callback. Escape (the `cancel` path) was not stress-tested.

## Caveats

- The prototype is eight parts and one board. The real catalog is much larger, so the search text may need more than three characters; the PinPicker has more pins and several boards. Counts for the real tool will be higher. A margin of 20 presses is left against the bound.
- Two circuit variants were counted, because the card's wording ("place an LED, one wire to D13, edit a resistor value") does not say whether the resistor is already on the board.
- Starting focus is the body and `/` is counted. A person who starts inside a toolbar or the code editor needs a few more presses (Tab, F6 or Escape) first.
- No screen reader was run. The live region text is untested for how a reader speaks it.
- Chromium only. Playwright's `keyboard.press` sends real key events, but typing speed in the script is faster than a person's, so the focus race above is more likely here than in use.
- The runner script is not committed (the card puts it in the scratchpad); the steps above reproduce it.
