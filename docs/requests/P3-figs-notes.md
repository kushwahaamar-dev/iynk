# T2a's notes for T2 (P3-figs-<lang> → P3-ui-<lang>)

The figure-dictionary agents' own notes from their reports (2026-10-25 ~00:05 CDT), kept so the UI strings and
the figure delta follow the same choices. Read your language's section. Points about missing keys are handled:
the driver regenerated `src/i18n/figure-keys.json` with the acorn-based collector (`a516233`).

## es (Spanish)

- The key list is missing some strings the figures show, so these stay English in every language until
  scripts/figure-strings.mjs is fixed and re-run: 'Off' (the labels toggle when off; 'On' is a key and is translated
  'Sí'), 'Every part is on' (the disabled chip in Place a part), 'Turned round' (a bench parameter name), and the
  drone engine's MSG table in figures/engine/drone.js ('Unplug the battery first: never work on a live quad', 'Props
  go on LAST: ...', 'Every motor spins the right way', 'Battery unplugged', 'Already built', 'Wait for the test to
  finish' and the rest). The wing and vtol long messages ('Stick back should lift BOTH elevons... Fix it: Add next
  part, SERVOS: direction checked') are missing too. The collector probably misses them because they're defined in
  objects rather than passed straight to CF_T/T. When P3-ui-es adds them, it should reuse these terms: Add next part =
  'Añade la siguiente pieza', SERVOS: direction checked = 'SERVOS: sentido comprobado', FLIGHT CTRL: arrow to the nose
  = 'CONTROLADORA: flecha hacia el morro'.
- For P3-ui-es: some drone UI buttons in src/i18n/messages/es/dronelab.json are still English, and the figure now
  names them as follows. Make the UI match: Build it for me = 'Móntalo por mí', Take it apart = 'Desmóntalo', Wiring
  sheet = 'Hoja de cableado', Bench = 'Banco', View = 'Vista', Exploded view = 'Vista despiezada', Parts = 'Piezas',
  Battery = 'Batería', Checks = 'Comprobaciones'. robotics.json still has 'Break it' in English; the figure uses
  'Averíala', as the uno-r3 prose does ('quita la resistencia en Averíala').
- Choices made for consistency: bench and drone action buttons use the tú imperative, matching the prose's 'menú
  Coloca una pieza' (Coloca una pieza, Quita una pieza, Suelda las uniones, Carga el sketch, Desconecta, Repáralo
  todo, Deja la PCB desnuda). View names match boardlab.json (Placa, Protoboard, Esquema, Árbol de alimentación, Vista
  despiezada, Transparente). Flyback diode = 'diodo de protección' and canopy = 'cúpula', as the es prose has them.
  Labels and sentences use decimal commas ('3,3 V', 'Condensador de 0,1 µF'), as the es prose does. Pure value
  readouts ('7.4 V · 148 mA', 'R1 · 4.7 kΩ') keep their dots so they read the same as the numbers the figures format
  at run time.
- Left in English on purpose: silkscreen text printed on the real boards (ANALOG IN, ARDUINO.CC, 5V IN, EXT 5V, NONE,
  'Capacitive Soil Moisture Sensor v1.2', BY/ST, POWER, DIGITAL (PWM~)), code (disableOutputs(), analogWrite), and the
  Betaflight CLI line 'arming disable flags: {flags}'. Because 'none' is one shared key, that CLI line shows 'ninguna'
  when no flags are set.
- Gender: where a placeholder name could be either gender, I wrote the sentence so it doesn't need agreement (for
  example 'Pieza colocada: {name}', 'Falta {name}', 'Se ha quitado {short}', 'Coloca primero: {part}').
- I did not see the translations in a running figure, because the brief rules out Playwright and cfshoot on this wave.
  Long Spanish labels are about 20-30% wider than English. The figures size label boxes from the text (CF_TW), but a
  fresh-eyes look at a dense board such as uno-r3 in es would catch any crowding.

## fr (French)

- The labels toggle is missing a key. core.js:561 switches the toggle text to CF_T('Off'), but 'Off' is not in
  figure-keys.json (the collector only sees the starting 'On'). Once someone presses it, the button reads 'Off' in
  English in every language. I translated 'On' as 'Activé'. The driver or P2-engine needs to add 'Off' to the key
  list, and then each dictionary needs an entry (fr: 'Désactivé'). I could not add it myself, because the test fails
  on keys that are not in the list.
- Silkscreen text goes through T() (bench.js:656), so the text printed on the boards is in the key list. Strings that
  only appear on the silkscreen stay as printed, because the French prose says the pins are labelled as on the
  silkscreen: ANALOG IN, DIGITAL (PWM~), POWER, TRAFFIC LIGHT, L298N MODULE, NONE, LED TRAINER, Capacitive Soil
  Moisture Sensor v1.2, RX←0, RST EN. Some keys are both silkscreen and a callout or status, so one entry can't serve
  both. I translated 'MOTOR' as 'MOTEUR', so the TB6612FNG silkscreen also reads MOTEUR. I kept 'POWER', 'ON' and
  'OFF' in English, so the led-resistor slide-switch callout and the bench OFF status stay English. A separate key for
  silkscreen text, or not translating it at all, would fix this properly.
- Decimals: names and sentences use the French comma, as the prose does ('Condensateur tantale 4,7 µF'). Pure readouts
  keep the point ('7.4 V · 148 mA', 'BT1 · 6.3 V', 'R1 · 4.7 kΩ', 'P1 · 1 lx · 59.72 kΩ'), because the readouts next
  to them are formatted with toFixed() at run time and show a point. Using commas there would make the same value flip
  between 6,3 and 6.4.
- The typography follows the French prose: a no-break space (U+00A0) before : ; ? ! and inside « », and ' %' with a
  space.
- Button names use the infinitive (Casser, Démonter, Calibrer l'accéléromètre, Vérifier le sens des moteurs,
  Téléverser le sketch, Montage automatique). The last two existing ones match the bench button names that
  src/i18n/messages/fr/flight.json already uses. P3-ui-fr should use the same words in the strings that are still
  English: dronelab.json build.buildForMe = 'Montage automatique', boardlab.json view.exploded = 'Vue éclatée',
  view.seeThrough = 'Vue transparente', failures.title = 'Casser'.
- The French prose is not consistent with itself in a few places, and each figure string follows the prose of the page
  it comes from: 'la Nano' on the board page but 'le Nano' on the robotics benches; both 'low-ESR' and 'à faible ESR';
  both 'Vérification avant armement' and 'Vérifications pré-armement'. Program names follow the prose too:
  'Clignotement RGB', 'Bonjour en série', 'Pivot sur place', 'Radar de recul', 'Roue chromatique RGB', 'Chronomètre de
  réflexes'.
- Note names stay in English notation ('440 Hz (A4)'), because the {note} placeholder is filled at run time with
  English note names.
- I did not check the figures on screen. Shared rule 3 says no Playwright or cfshoot runs during wave B, so no French
  figure was rendered. I worked out the fit of the drone wiring-sheet titles and subtitles from the code instead:
  blocks are 150 units wide with monospace text, which allows about 19 subtitle characters and about 14 title
  characters. I shortened the entries that would have overflowed, e.g. 'analogique, 30° ↑' and 'CAMÉRA 3D'. The other
  labels sit in pills sized with CF_TW, which grow to fit the text.
- Wave B's new figures (basys3, de10-lite, swarm, vtol, lm2596 and others) are not covered. Their keys are not in
  src/i18n/figure-keys.json yet. Once the file is regenerated, the fr test will list them as missing, and P3-ui-fr has
  to add them.

## de (German)

- 'Place a part' is left in English on purpose. Three German prose strings name that menu in English
  (boards/esp32-devkitc.json, boards/pico.json, robotics/uno-r3-build.json: 'über das Menü „Place a part“'), and the
  brief says button names must read the same in prose and figure. If the driver wants it in German, change both
  together: the figure value and those 3 prose quotes to „Bauteil setzen“.
- 'Serial hello' is 'Serielles Hallo', as in uno-r3-build, esp32-devkitc and nodemcu. Two prose files still use the
  English name: boards/nano.json ('Lade "Serial hello" hoch') and boards/uno-r4.json ('Lade Serial hello hoch'). Those
  two should say 'Serielles Hallo' to match the Program picker. That fix belongs to the prose owner.
- Possible gap in figure-keys.json for the P3-ui-de delta: bench.js:595 calls say('Powered: {name} starts', …) and the
  template is missing from the list. Only its filled-in forms are there ('Powered: Blink starts' etc.), and I
  translated those as 'Strom an: „…“ startet'. bench.js has uncommitted wave-B changes, so the key list may just be
  older than that code. Once the template becomes a key, it needs the same German.
- Choices that follow the German prose: Unplug = Abklemmen, Break it = Kaputt machen, Exploded view =
  Explosionsansicht, See-through = Durchsicht, Power tree = Versorgungsbaum, Upload sketch = Sketch hochladen, Bench =
  Werkbank, the prose part names taken word for word (271 strings matched exactly), 'props in' kept as in the prose,
  rpm = U/min.
- Silkscreen and other printed text stays as printed: ARDUINO, UNO R3, DIGITAL (PWM~), ANALOG IN, POWER, ON/OFF, BOOT,
  FLASH, LED TRAINER, TRAFFIC LIGHT, the 'Capacitive Soil Moisture Sensor v1.2' print, DEPTH. Upper-case callout and
  block names are in German, kept to 15 characters or fewer for the 150 px wiring-sheet blocks (FLUGCONTROLLER, AKKU,
  XT60 + ELKO).
- Decimal commas appear only in static part names, as the prose does them (4,7-µF-Tantalkondensator). Runtime readouts
  that ended up as keys keep the dot, so they match the numbers the figure fills in at run time ('BT1 · 6.3 V', 'P1 ·
  1 lx · 59.72 kΩ', '7.4 V · 378 mA', 'R1 · 4.7 kΩ').
- No visual check of the German figures in a browser: cfshoot.py runs Playwright, and the brief says not to run
  Playwright while wave B is running. The driver should cfshoot a few figures in de at the gate (the long labels:
  drone wiring-sheet block titles, board callout tags).

## zh (Chinese)

- figure-keys.json is missing strings the figures do translate, and the test rejects extra keys, so I could not add
  them to zh.json. They will show in English until the key list is regenerated and P3-ui adds them. Examples: the
  drone MSG table in figures/engine/drone.js ('Already built', 'Battery unplugged', '{short} is already on', 'Wait for
  the test to finish', 'Unplug the battery first: never work on a live quad'); the bench status values in
  figures/engine/bench.js statusText ('POWERED', 'BROWN-OUT', 'IN RESET'); the Labels toggle's 'Off' in core.js;
  'Every part is on'; and paramNames such as 'Put in backwards'. The cause is that scripts/figure-strings.mjs only
  collects literals passed directly to CF_T/T, so strings looked up from tables are missed.
- figures/boards/esp32-s3-devkitc-1.js shows the raw fault id 'gpio5v:GPIO4' as a Break it label, and that id is
  itself a key. It is kept as-is in zh. The figure needs a readable label for it.
- Some keys are shared by strings with different meanings, and one translation has to serve all of them. 'full' and
  'half' are used for motor speed, LiPo charge (lipo-2s) and stepper step mode, so they became 全 and 半; with the
  picker label beside them these read as full or half step, speed or charge. 'ON' and 'OFF' are board silkscreen (and
  the Uno's ON LED tag) and also battery or bench status values, so they stay in English. 'low' and 'high' became 低
  and 高.
- Silkscreen and printed markings stay in English, as on the real boards: ARDUINO, ANALOG IN, DIGITAL (PWM~), POWER,
  UNO R3, R4 MINIMA, L298N MODULE, TRAFFIC LIGHT, LED TRAINER, 'Capacitive Soil Moisture Sensor v1.2', pin names. Part
  tags and drone block titles are translated (BATTERY 电池, FLIGHT CTRL 飞控, ACTION CAM 运动相机).
- The zh prose uses different terms for the same thing in a few places, and the figure follows one of them. 'Exploded
  view' is both 爆炸图 and 爆炸视图; the figure uses 爆炸视图, as the UI messages do. The Uno headers are both 排针 and 排母; the
  figure uses 排母, since they are female headers. 'Smoke stopper test' is 防烟测试 in the drone prose and 防烟器测试 in
  messages/zh/solana.json; the figure uses 防烟测试. P3-prose-zh or P3-ui-zh may want to settle each one.
- Button names match the zh prose: Place a part 放置零件, Break it 弄坏它, Unplug 断电, Power 供电, See-through 透视, Forward 正转,
  Brake 刹车, Coast 滑行, Spin on the spot 原地转圈, Half speed (caps on) 半速（跳线帽插着）, Input HIGH 输入 HIGH, Serial hello 串口问好,
  props in 内八, Strip to bare PCB 拆到只剩裸 PCB.
- The scratchpad still holds the batch files and the merge script
  (/private/tmp/claude-501/-Users-amar-Codes-ak-simlab/5990e040-4ffc-48cb-ba35-923d41b56efe/scratchpad/zh/merge.py,
  t*.tsv). They are not needed, because zh.json is the only source.
- The page was not checked in a browser: Playwright, next build and the crawl are left to the driver at the gate, per
  shared rule 3. The CJK widths of the label pills are handled by CF_TW, but nobody has looked at them in zh yet.

## hi (Hindi)

- The test passes with little room: 8.5% of the 3+-word keys are copied, against a 10% limit. The copied ones really
  can't be translated: values ("P1 · 1 kΩ", "7.4 V · 148 mA"), part and product names ("Arduino UNO R4 Minima", "35 A
  4-in-1 ESC (AM32)", "UART2 CRSF + 5 V") and one silkscreen line ("Capacitive Soil Moisture Sensor v1.2"). If wave B
  adds many value-only keys, the share could pass 10% and fail this test even though nothing is wrong. Worth knowing
  when P3-ui-hi adds the next batch of keys.
- Key gap for the driver or P3-ui (figure-keys.json is not my file): the collector misses strings that reach CF_T
  through a variable or a table. figures/engine/drone.js MSG/LOG has 26 that are not keys, e.g. 'Unplug the battery
  first: never work on a live quad', 'PROPS OFF! Never spin motors on the bench with props on', 'POP: the capacitor
  was in backwards and vented...'. figures/engine/bench.js has 23 more, e.g. 'Unplug the power first: never work on a
  live board', 'Uploading: wait for it', 'Fix the fault first: unplug, then repair'. The template 'Powered: {name}
  starts' (bench.js line 595) is missing too, while its filled-in forms ('Powered: Blink starts' and others) are keys.
  In every language, all of these show in English. Adding them to the dictionaries would fail the test's 'nothing
  else' check, so they need a fix in scripts/figure-strings.mjs (pick up MSG/LOG/GROUP_NAMES/PARAM_NAMES values and
  say() literals) and a fresh figure-keys.json.
- Translation choices, so P3-ui-hi stays consistent. I kept the 80 board silkscreen strings in English as printed
  (ANALOG IN, DIGITAL (PWM~), ARDUINO, RESET, ON/OFF, IN1-IN4 and so on), found by scanning the figures' silk arrays.
  Part designators before ' · ' stay as they are. I took 261 entries verbatim from the matching Hindi prose strings
  (part names, test names), and built 375 'C1 · …' entries from their already-translated tail, so the figure and the
  prose use the same words.
- Terms that match the Hindi prose: See-through = आर-पार दृश्य, Exploded view = खुला हुआ दृश्य, Break it = खराबी
  डालें, Unplug = पावर हटाएँ, Place a part = पुर्ज़ा लगाएँ, 'Blink RGB' = RGB ब्लिंक. 'props in' stays English, as in
  the prose. The 'Powered: <mode> starts' strings use the same Hindi mode names as the mode keys.
- Not seen in a browser: Hindi strings are longer than English and pills are sized with CF_TW, but no one has checked
  them for overflow on a 390 px screen. The driver's cfshoot/crawl with lang=hi would show it.
- Two other agents' files appeared in src/i18n/figures/ while I worked (de.json, zh.json). I did not touch them.
