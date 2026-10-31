import type { Descriptor } from "../../parts/descriptor.ts";
import type { Evidence } from "../../project/diagnosis.ts";
import type { Op } from "../../project/generated/types.ts";
import { evidenceFromReading, evidenceFromSerial } from "./evidence.ts";
import type { CodeFact, CodeFacts, Finding, NetView, PinInfo, ProblemTarget, Rule, RuleInput } from "./types.ts";

const WIRE_BEGIN = "code:wire-begin-pins@1";
const PIN_MISMATCH = "code:pin-mismatch@1";
const I2C_ADDRESS = "code:i2c-address@1";
const SERIAL_BAUD = "code:serial-baud@1";
const PIN_MODE = "code:pin-mode@1";

const OUTPUT_ELEMENTS: ReadonlySet<string> = new Set(["led", "buzzer", "relay"]);

const evidence = (kind: Evidence["kind"], ref: string, value: string | number): Evidence => ({
  kind,
  ref,
  at: 0,
  value,
  provenance: "computed",
  tier: "T0",
  modelIds: [],
});

const hex = (n: number): string => `0x${n.toString(16).toUpperCase().padStart(2, "0")}`;

const fileTarget = (fact: CodeFact<unknown>): ProblemTarget => ({ kind: "file", id: fact.file, line: fact.line });
const pinTarget = (p: PinInfo): ProblemTarget => ({ kind: "pin", id: p.part, pin: p.pin });

/** Code names a pin as `13`; the board names it `D13`, `GPIO13` or `GP13`. */
const samePin = (codePin: string, boardPin: string): boolean => {
  const code = codePin.toUpperCase();
  const board = boardPin.toUpperCase();
  return board === code || [`D${code}`, `GPIO${code}`, `GP${code}`].includes(board);
};

const pinsOfPart = (view: NetView, part: string): PinInfo[] =>
  (view.descriptor(part)?.pins ?? []).flatMap((p) => view.pin(part, p.id) ?? []);

const boardPins = (view: NetView): PinInfo[] =>
  view.parts().filter((part) => view.isBoard(part)).flatMap((part) => pinsOfPart(view, part));

const boardPinFor = (view: NetView, codePin: string): PinInfo | undefined =>
  boardPins(view).find((p) => samePin(codePin, p.pin));

const hasElement = (d: Descriptor | undefined, elements: ReadonlySet<string>): boolean =>
  d?.behaviour.layers.some((l) => l.model.kind === "element" && elements.has(l.model.element)) ?? false;

/** The LED, buzzer or relay a net drives directly or through one resistor. */
function outputPartOn(view: NetView, net: string | null): string | undefined {
  if (net === null) return undefined;
  const direct = view.pinsOn(net).find((p) => !view.isBoard(p.part) && hasElement(view.descriptor(p.part), OUTPUT_ELEMENTS));
  if (direct) return direct.part;
  for (const r of view.resistorsOn(net)) {
    for (const far of pinsOfPart(view, r.part)) {
      if (far.pin === r.pin || far.net === null || far.net === net) continue;
      const found = view.pinsOn(far.net).find((p) => !view.isBoard(p.part) && hasElement(view.descriptor(p.part), OUTPUT_ELEMENTS));
      if (found) return found.part;
    }
  }
  return undefined;
}

const protocolPins = (d: Descriptor | undefined, kind: string): { sda?: string; scl?: string; params: Record<string, unknown>; role: string }[] =>
  (d?.protocols ?? [])
    .filter((p) => p.kind === kind)
    .map((p) => ({ sda: p.pins.sda, scl: p.pins.scl, params: (p.params ?? {}) as Record<string, unknown>, role: p.role }));

function make(
  def: Pick<Rule, "id" | "causeId" | "symptomId" | "needs"> & { severity: Finding["severity"] },
  check: (input: RuleInput & { code: CodeFacts }, finding: (f: Omit<Finding, "ruleId" | "causeId" | "symptomId" | "severity">) => Finding) => Finding[],
): Rule {
  const finding = (f: Omit<Finding, "ruleId" | "causeId" | "symptomId" | "severity">): Finding => ({
    ruleId: def.id,
    causeId: def.causeId,
    symptomId: def.symptomId,
    severity: def.severity,
    ...f,
  });
  return {
    id: def.id,
    layer: "code",
    causeId: def.causeId,
    symptomId: def.symptomId,
    needs: def.needs,
    enabled: true,
    check: (input) => (input.code ? check({ ...input, code: input.code }, finding) : []),
  };
}

const wireBeginPins = make(
  { id: WIRE_BEGIN, causeId: "swapped-pins", symptomId: "i2c-no-ack", needs: ["descriptors", "code"], severity: "error" },
  ({ view, code, run, skipped }, finding) => {
    const begin = code.wireBegin;
    if (!begin) return [];
    const sda = boardPinFor(view, begin.value.sda);
    const scl = boardPinFor(view, begin.value.scl);
    if (!sda || !scl) {
      skipped.add(WIRE_BEGIN, "unknown-pin");
      return [];
    }
    if (sda.net === null || scl.net === null || sda.net === scl.net) return [];

    const out: Finding[] = [];
    for (const part of view.parts()) {
      if (view.isBoard(part)) continue;
      for (const proto of protocolPins(view.descriptor(part), "i2c")) {
        const deviceSda = proto.sda === undefined ? undefined : view.pin(part, proto.sda);
        const deviceScl = proto.scl === undefined ? undefined : view.pin(part, proto.scl);
        if (!deviceSda || !deviceScl || deviceSda.net !== scl.net || deviceScl.net !== sda.net) continue;

        const proof: Evidence[] = [
          evidence("pin-level", `${sda.pin} -> ${sda.net}`, sda.net),
          evidence("pin-level", `${scl.pin} -> ${scl.net}`, scl.net),
        ];
        if (run) {
          for (const line of run.serial.filter((l) => /not found/i.test(l.text))) proof.push(evidenceFromSerial(line, "T1"));
          for (const net of [sda.net, scl.net]) {
            const v = run.node(net, run.endNs);
            if (v) {
              proof.push(
                evidenceFromReading({ at: run.endNs, quantity: "voltage", a: net, value: v.v, unit: "V", provenance: v.provenance, tier: v.tier, modelIds: [] }),
              );
            }
          }
          const nack = run.bus.find((b) => b.kind === "nack");
          if (nack) proof.push({ ...evidence("timeline", `bus:${nack.bus}`, nack.addr === undefined ? "nack" : `nack ${hex(nack.addr)}`), at: nack.at });
        }
        out.push(
          finding({
            targets: [fileTarget(begin), pinTarget(sda), pinTarget(scl), { kind: "part", id: part }],
            evidence: proof,
            messageKey: "check.wire-begin-pins",
            args: { part, sda: begin.value.sda, scl: begin.value.scl },
            fixes: [
              { kind: "code", messageKey: "fix.wire-begin-order", args: { sda: begin.value.scl, scl: begin.value.sda } },
              { kind: "wiring", messageKey: "fix.i2c-swap-wires", args: { part } },
            ],
          }),
        );
      }
    }
    return out;
  },
);

type PinFact = CodeFact<{ pin: string }>;

/** One `source.edit` per distinct literal that names the pin, or none when any use of the pin has no known literal. */
function pinEdits(code: CodeFacts, pin: string, to: string): Op[] | undefined {
  const uses: PinFact[] = [...code.pinModes, ...code.pinWrites, ...code.pinReads].filter((f) => f.value.pin === pin);
  const spans = new Map<string, { file: string; pos: number; len: number }>();
  for (const use of uses) {
    if (!use.span) return undefined;
    spans.set(`${use.file}:${use.span.pos}`, { file: use.file, ...use.span });
  }
  return [...spans.values()]
    .sort((a, b) => b.pos - a.pos)
    .map((s) => ({ k: "source.edit", id: s.file, baseSeq: 0, pos: s.pos, del: s.len, ins: to }));
}

const pinMismatch = make(
  { id: PIN_MISMATCH, causeId: "wrong-pin-in-code", symptomId: "code-no-effect", needs: ["descriptors", "code"], severity: "error" },
  ({ view, code, skipped }, finding) => {
    if (code.pinWrites.length === 0) return [];
    if (code.unresolved > 0) {
      skipped.add(PIN_MISMATCH, "non-literal-pin");
      return [];
    }
    const written = [...new Set(code.pinWrites.map((f) => f.value.pin))];
    const free = boardPins(view).filter(
      (p) =>
        (p.type === "digital_io" || p.type === "digital_out") &&
        p.net !== null &&
        view.netClass(p.net) !== "power" &&
        view.netClass(p.net) !== "ground" &&
        !written.some((w) => samePin(w, p.pin)) &&
        outputPartOn(view, p.net) !== undefined,
    );

    const out: Finding[] = [];
    for (const pin of written) {
      const wrong = boardPinFor(view, pin);
      if (!wrong) {
        skipped.add(PIN_MISMATCH, "unknown-pin");
        continue;
      }
      if (wrong.net !== null && view.pinsOn(wrong.net).some((p) => !view.isBoard(p.part))) continue;
      const right = free.shift();
      if (!right) break;
      const part = outputPartOn(view, right.net) ?? "";
      const digits = /^(?:D|GPIO|GP)?(\d+)$/i.exec(right.pin)?.[1];
      const ops = digits === undefined ? undefined : pinEdits(code, pin, digits);
      const at = code.pinWrites.find((f) => f.value.pin === pin);
      out.push(
        finding({
          targets: [...(at ? [fileTarget(at)] : []), pinTarget(wrong), pinTarget(right), { kind: "part", id: part }],
          evidence: [evidence("state", `pin:${wrong.part}.${wrong.pin}`, "written by the code, nothing connected"), evidence("state", `pin:${right.part}.${right.pin}`, `drives ${part}, never written`)],
          messageKey: "check.pin-mismatch",
          args: { codePin: pin, wiredPin: right.pin, part },
          fixes: [
            { kind: "code", messageKey: "fix.pin-mismatch-code", args: { from: pin, to: digits ?? right.pin }, ...(ops && ops.length > 0 ? { ops } : {}) },
            { kind: "wiring", messageKey: "fix.pin-mismatch-wiring", args: { part, pin: wrong.pin } },
          ],
        }),
      );
    }
    return out;
  },
);

/** The addresses a slave answers to, given the level its address-select pin is wired to. */
function answeredBy(view: NetView, part: string, params: Record<string, unknown>): number[] {
  const { address, alt_address: alt, address_select_pin: select } = params;
  if (typeof address !== "number") return [];
  if (typeof alt !== "number") return [address];
  const net = typeof select === "string" ? view.pin(part, select)?.net : undefined;
  const level = net ? view.netClass(net) : undefined;
  return level === "ground" ? [address] : level === "power" ? [alt] : [address, alt];
}

const i2cAddress = make(
  { id: I2C_ADDRESS, causeId: "wrong-value", symptomId: "i2c-no-ack", needs: ["descriptors", "code"], severity: "error" },
  ({ view, code, skipped }, finding) => {
    if (code.i2cAddresses.length === 0) return [];
    const parts = view.parts().filter((part) => !view.isBoard(part));
    if (parts.some((part) => !view.descriptor(part))) {
      skipped.add(I2C_ADDRESS, "undescribed-part");
      return [];
    }
    const answers = parts.flatMap((part) =>
      protocolPins(view.descriptor(part), "i2c")
        .filter((p) => p.role === "slave")
        .flatMap((p) => answeredBy(view, part, p.params)),
    );
    if (answers.length === 0) {
      skipped.add(I2C_ADDRESS, "no-i2c-device");
      return [];
    }
    const out: Finding[] = [];
    const seen = new Set<number>();
    for (const fact of code.i2cAddresses) {
      const { addr } = fact.value;
      if (answers.includes(addr) || seen.has(addr)) continue;
      seen.add(addr);
      out.push(
        finding({
          targets: [fileTarget(fact)],
          evidence: [evidence("state", `code:${fact.file}:${fact.line}`, `code uses ${hex(addr)}; the wired devices answer to ${[...new Set(answers)].map(hex).join(", ")}`)],
          messageKey: "check.i2c-address",
          args: { addr: hex(addr), expected: [...new Set(answers)].map(hex).join(", ") },
          fixes: [{ kind: "code", messageKey: "fix.i2c-address", args: { expected: [...new Set(answers)].map(hex).join(", ") } }],
        }),
      );
    }
    return out;
  },
);

const serialBaud = make(
  { id: SERIAL_BAUD, causeId: "x-code.serial-baud-mismatch", symptomId: "serial-garbled", needs: ["code"], severity: "warning" },
  ({ code, instruments, skipped }, finding) => {
    const begin = code.serialBegin;
    if (!begin) return [];
    const bauds = (instruments ?? [])
      .filter((i) => i.kind === "serial-monitor")
      .map((i) => (i.settings as { baud?: unknown } | undefined)?.baud)
      .filter((b): b is number => typeof b === "number");
    if (bauds.length === 0) {
      skipped.add(SERIAL_BAUD, "no-serial-monitor");
      return [];
    }
    if (bauds.includes(begin.value.baud)) return [];
    return [
      finding({
        targets: [fileTarget(begin)],
        evidence: [evidence("state", `code:${begin.file}:${begin.line}`, `Serial.begin(${begin.value.baud}), monitor at ${bauds.join(", ")}`)],
        messageKey: "check.serial-baud",
        args: { baud: begin.value.baud, monitor: bauds.join(", ") },
        fixes: [{ kind: "code", messageKey: "fix.serial-baud", args: { baud: bauds[0] ?? 0 } }],
      }),
    ];
  },
);

const pinMode = make(
  { id: PIN_MODE, causeId: "x-code.pin-mode-wrong", symptomId: "pin-level-wrong", needs: ["code"], severity: "warning" },
  ({ view, code, skipped }, finding) => {
    if (code.pinReads.length === 0 && code.pinWrites.length === 0) return [];
    if (code.unresolved > 0) {
      skipped.add(PIN_MODE, "non-literal-pin");
      return [];
    }
    const modesOf = (pin: string): string[] => code.pinModes.filter((f) => f.value.pin === pin).map((f) => f.value.mode);
    const out: Finding[] = [];
    const seen = new Set<string>();
    const report = (fact: CodeFact<{ pin: string }>, messageKey: string): void => {
      const key = `${messageKey}:${fact.value.pin}`;
      if (seen.has(key)) return;
      seen.add(key);
      const board = boardPinFor(view, fact.value.pin);
      out.push(
        finding({
          targets: [fileTarget(fact), ...(board ? [pinTarget(board)] : [])],
          evidence: [evidence("state", `code:${fact.file}:${fact.line}`, `pin ${fact.value.pin} is used against its pinMode`)],
          messageKey,
          args: { pin: fact.value.pin },
          fixes: [{ kind: "code", messageKey: `${messageKey.replace("check.", "fix.")}`, args: { pin: fact.value.pin } }],
        }),
      );
    };
    for (const fact of code.pinReads) {
      const modes = modesOf(fact.value.pin);
      if (fact.value.fn === "digitalRead" && modes.length > 0 && modes.every((m) => m === "OUTPUT")) report(fact, "check.pin-mode-read-output");
    }
    for (const fact of code.pinWrites) {
      if (fact.value.fn === "digitalWrite" && !modesOf(fact.value.pin).includes("OUTPUT")) report(fact, "check.pin-mode-write-input");
    }
    return out;
  },
);

export const CODE_RULES: readonly Rule[] = [wireBeginPins, pinMismatch, i2cAddress, serialBaud, pinMode];
