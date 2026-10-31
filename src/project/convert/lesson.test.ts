// @vitest-environment node
import { readFileSync } from "node:fs";
import { beforeAll, describe, expect, it } from "vitest";
import type { Project } from "../generated/types.ts";
import { stateHash } from "../hash.ts";
import type { InterfaceSnapshot } from "../holes.ts";
import { netlist, nodeOfPin } from "../netlist.ts";
import { normalizeForWrite, toFileText } from "../normalize.ts";
import { validateText, validateValue } from "../validate.ts";
import { circuitToNets } from "./circuit.ts";
import { boardIds, loadBoard } from "./convert.testing.ts";
import type { LoadedBoard } from "./convert.testing.ts";
import { boardInterface, partInterface } from "./interfaces.ts";
import { convertBoardTour, convertLesson } from "./lesson.ts";
import type { ConvertResult } from "./lesson.ts";
import type { ReportItem } from "./types.ts";

const boards = new Map<string, LoadedBoard>();
const tours = new Map<string, ConvertResult>();
const lessons = new Map<string, ConvertResult>();
let elapsedMs = 0;

beforeAll(async () => {
  const t0 = performance.now();
  for (const id of boardIds()) {
    const board = await loadBoard(id);
    boards.set(id, board);
    tours.set(id, convertBoardTour(board.item, board.texts, board.ctx));
    for (const lesson of board.item.data.lessons) {
      lessons.set(`${id}/${lesson.id}`, convertLesson(board.item, lesson.id, board.texts, board.circuits, board.ctx));
    }
  }
  elapsedMs = performance.now() - t0;
});

const all = (): ConvertResult[] => [...tours.values(), ...lessons.values()];
const reports = (): ReportItem[] => all().flatMap((r) => r.report);

/** Every path at which two values differ, with array positions written as `[]`. */
function differences(a: unknown, b: unknown, path = ""): Set<string> {
  const out = new Set<string>();
  const walk = (x: unknown, y: unknown, at: string): void => {
    if (Array.isArray(x) && Array.isArray(y)) {
      if (x.length !== y.length) out.add(`${at}[] length`);
      x.slice(0, Math.min(x.length, y.length)).forEach((v, i) => walk(v, y[i], `${at}[]`));
    } else if (x && y && typeof x === "object" && typeof y === "object" && !Array.isArray(x) && !Array.isArray(y)) {
      const xs = x as Record<string, unknown>;
      const ys = y as Record<string, unknown>;
      for (const key of new Set([...Object.keys(xs), ...Object.keys(ys)])) {
        if (!(key in xs)) out.add(`${at}/${key} missing`);
        else if (!(key in ys)) out.add(`${at}/${key} extra`);
        else walk(xs[key], ys[key], `${at}/${key}`);
      }
    } else if (!Object.is(x, y)) out.add(at);
  };
  walk(a, b, path);
  return out;
}

describe("the Uno R3 lesson button against the example", () => {
  const example = JSON.parse(
    readFileSync(new URL("../../../docs/MASTER_PLAN/04_ARCHITECTURE/schemas/examples/lesson-uno-r3-button.project.json", import.meta.url), "utf8")
      .replaceAll("brd_uno", "brd_main")
      .replaceAll("cmp_bb1", "cmp_bb"),
  ) as Project;

  // The instance ids (brd_uno, cmp_bb1) are renamed above, as the card declares. Each entry below is a difference the
  // converter keeps on purpose or a hand edit of the prototype that it does not reproduce; `[]` stands for any index.
  const declared: { paths: string[]; why: string }[] = [
    { paths: ["/dependencies/components[]/interface/groups extra", "/dependencies/components[]/interface/pins[] length"], why: "the surface snapshot has its holes and strips (A-11)" },
    { paths: ["/meta/createdAt", "/meta/updatedAt", "/provenance/origin/at"], why: "the converter writes ctx.at" },
    { paths: ["/access/owners[]", "/actors[]/id", "/actors[]/name", "/provenance/createdBy"], why: "the example names its author, the converter writes the actor usr_iynk" },
    { paths: ["/provenance/createdWith/version", "/provenance/origin/tool"], why: "the example is the spec prototype, the converter writes the app version and its own tool name" },
    { paths: ["/simulation/seed"], why: "the seed is the SIM 5.2 default 0x2545f491, the example has 1" },
    { paths: ["/meta/tags[]"], why: "the first tag is the board id, not the family word of the example" },
    { paths: ["/parameters[]/label"], why: "the example has plain strings for the labels, the converter writes all six languages" },
    { paths: ["/guide/starter/template"], why: "the converter writes the starter comments in English, the example keeps the {{t:}} keys" },
    { paths: ["/guide/references missing"], why: "the example lists three datasheets chosen by hand, a lesson has no sources of its own" },
    {
      paths: ["/dependencies/components[]/interface/pins[]/class extra", "/dependencies/components[]/interface/pins[]/type"],
      why: "the converted pins carry a class (RC-37) and the IOREF pin is power_io, the example has neither",
    },
  ];

  it("matches apart from the declared differences", () => {
    const found = [...differences(normalizeForWrite(lessons.get("uno-r3/button")!.project), normalizeForWrite(example))].sort();
    expect(found).toEqual(declared.flatMap((d) => d.paths).sort());
    expect(declared.every((d) => d.why.length > 0)).toBe(true);
  });
});

describe("the 83 converted projects", () => {
  it("are 12 tours and 71 lessons with distinct ids", () => {
    expect(tours.size).toBe(12);
    expect(lessons.size).toBe(71);
    expect(new Set(all().map((r) => r.project.id)).size).toBe(83);
  });

  it("convert in well under 30 s", () => {
    expect(elapsedMs).toBeLessThan(30_000);
  });

  it("validate with no error", () => {
    for (const { project } of all()) {
      const errors = validateValue(project).diagnostics.filter((d) => d.severity === "error");
      expect(errors.map((d) => `${project.id} ${d.code} ${d.path} ${d.message}`)).toEqual([]);
    }
  });

  it("round trip through the file text with the same state hash", () => {
    for (const { project } of all()) {
      const text = toFileText(project);
      const report = validateText(text);
      expect(report.ok, project.id).toBe(true);
      expect(report.diagnostics.filter((d) => d.code === "V1-EDITED-OUTSIDE")).toEqual([]);
      expect(stateHash(report.doc!), project.id).toBe(stateHash(project));
    }
  });

  it("convert to the same bytes twice", () => {
    for (const [key, first] of lessons) {
      const board = boards.get(key.split("/")[0]!)!;
      const again = convertLesson(board.item, key.split("/")[1]!, board.texts, board.circuits, board.ctx);
      expect(toFileText(again.project), key).toBe(toFileText(first.project));
    }
    for (const [id, first] of tours) {
      const board = boards.get(id)!;
      expect(toFileText(convertBoardTour(board.item, board.texts, board.ctx).project), id).toBe(toFileText(first.project));
    }
  });

  it("carry the origin of the item they come from", () => {
    for (const [key, { project }] of lessons) {
      const [board, lesson] = key.split("/");
      expect(project.provenance.origin).toMatchObject({ kind: "migration", catalogue: { lab: "board", id: board, child: lesson } });
      expect(project.id).toBe(`prj_${board}-${lesson}`);
    }
    for (const [id, { project }] of tours) expect(project.id).toBe(`prj_${id}-tour`);
  });

  it("start every project as unchecked third-party content", () => {
    for (const { project } of all()) expect(project.provenance.thirdParty).toMatchObject([{ review: "unchecked" }]);
  });
});

describe("the nets of the lessons", () => {
  const circuitLessons = (): [string, ConvertResult][] =>
    [...lessons].filter(([key]) => {
      const [id, lesson] = key.split("/");
      return boards.get(id!)!.item.data.lessons.find((l) => l.id === lesson)!.circuit !== null;
    });

  it("are 57 lessons with a circuit and 14 on the bare board", () => {
    expect(circuitLessons()).toHaveLength(57);
    const bare = [...lessons].filter(([key]) => !circuitLessons().some(([k]) => k === key));
    expect(bare).toHaveLength(14);
    for (const [, { project }] of bare) {
      expect(project.nets).toEqual([]);
      expect(project.components).toEqual([]);
      expect(project.views[0]!.kind).toBe("board");
    }
  });

  it("equal the nets circuitToNets finds, and the netlist joins each net in one node", () => {
    for (const [key, { project }] of circuitLessons()) {
      const [id, lessonId] = key.split("/");
      const board = boards.get(id!)!;
      const circuit = board.circuits[board.item.data.lessons.find((l) => l.id === lessonId)!.circuit!]!;
      const parts = new Map<string, InterfaceSnapshot>();
      for (const part of circuit.parts) {
        const snapshot = partInterface(part.part, board.ctx.legs[part.part]!);
        parts.set(part.id, { ...snapshot, params: [...(board.ctx.params[part.part] ?? [])] });
      }
      const expected = circuitToNets(circuit, boardInterface(board.item, board.ctx.headers), { parts, surface: "cmp_bb", kind: circuit.breadboard });
      expect(project.nets, key).toEqual(expected.nets);
      expect(project.views[0]!.wires, key).toEqual(expected.wires);

      const nl = netlist(project);
      expect(nl.diagnostics.filter((d) => d.severity === "error"), key).toEqual([]);
      for (const net of project.nets) {
        const nodes = new Set(net.connections.map((m) => nodeOfPin(nl, m.c, m.p)?.id));
        expect(nodes.size, `${key} ${net.id}`).toBe(1);
      }
    }
  });
});

describe("what a lesson keeps of the catalogue", () => {
  it("keeps every check unchanged in kind and fields, with the label as text", () => {
    for (const [key, { project }] of lessons) {
      const [id, lessonId] = key.split("/");
      const board = boards.get(id!)!;
      const lesson = board.item.data.lessons.find((l) => l.id === lessonId)!;
      const stored = project.tests[0]!.checks;
      expect(stored, key).toHaveLength(lesson.checks.length);
      stored.forEach((check, i) => {
        const { id: checkId, label, visibility, ...fields } = check;
        const { label: key2, ...original } = lesson.checks[i]!;
        expect(fields, `${key} check ${i + 1}`).toEqual(original);
        expect(checkId).toBe(`c${i + 1}`);
        expect(visibility).toBe("visible");
        expect(label).toMatchObject({ en: board.texts.en[key2] });
      });
      expect(project.tests[0]).toMatchObject({ id: "main", runMs: lesson.runMs });
      expect(project.simulation.duration_ms).toBe(lesson.runMs);
    }
  });

  it("keeps the code of the starter as the source and the template", () => {
    for (const [key, { project }] of lessons) {
      const [id, lessonId] = key.split("/");
      const lesson = boards.get(id!)!.item.data.lessons.find((l) => l.id === lessonId)!;
      const source = project.sources[0]!;
      expect(source.content, key).not.toMatch(/\{\{[tp]:/);
      expect(project.guide!.starter!.template, key).not.toMatch(/\{\{t:/);
      expect(project.guide!.starter!.template.match(/\{\{p:/g)?.length ?? 0, key).toBe(lesson.code.source.match(/\{\{p:/g)?.length ?? 0);
      expect(project.boards[0]!.firmware!.language).toBe(lesson.language);
      expect(project.parameters.map((p) => p.name)).toEqual(lesson.params.map((p) => p.id));
    }
  });

  it("keeps the first variant on the board and all of them in the guide", () => {
    const wifi = lessons.get("pico/wifi")!.project;
    expect(wifi.boards[0]!.variant).toBe("pico-w");
    expect(wifi.guide!.variants).toEqual(["pico-w", "pico2-w"]);
    expect(wifi.guide!.legacyFigure!.variant).toBeDefined();
    expect(lessons.get("uno-r3/button")!.project.boards[0]!.variant).toBeUndefined();
  });

  it("keeps top and ports of the Verilog lessons", () => {
    const verilog = [...lessons.values()].filter((r) => r.project.boards[0]!.firmware!.language === "verilog");
    expect(verilog).toHaveLength(10);
    for (const { project } of verilog) {
      expect(project.boards[0]!.firmware!.top).toBeDefined();
      expect(Object.keys(project.boards[0]!.firmware!.ports ?? {}).length).toBeGreaterThan(0);
    }
  });

  it("pins the libraries of a lesson with their ecosystem", () => {
    const servo = lessons.get("uno-r3/servo")!.project;
    expect(servo.dependencies.libraries).toEqual([{ name: "Servo", ecosystem: "arduino" }]);
    expect(servo.boards[0]!.firmware!.libraries).toEqual(["Servo"]);
  });

  it("binds a chip to the part it drives", () => {
    const blink = lessons.get("uno-r3/blink")!.project;
    const bound = blink.components.filter((c) => Object.values(c.params ?? {}).some((v) => typeof v === "object"));
    expect(bound.length).toBeGreaterThan(0);
    for (const component of bound) {
      for (const value of Object.values(component.params!)) {
        if (typeof value === "object") expect(blink.parameters.map((p) => p.id)).toContain(value.param);
      }
    }
  });

  it("holds the tour: assembly steps, no nets, no code, no test", () => {
    const { project } = tours.get("uno-r3")!;
    expect(project.guide!.kind).toBe("tour");
    expect(project.guide!.assembly).toHaveLength(boards.get("uno-r3")!.item.data.assembly.length);
    expect(project.meta.kind).toBe("template");
    expect(project.nets).toEqual([]);
    expect(project.sources).toEqual([]);
    expect(project.tests).toEqual([]);
    expect(project.guide!.references).toHaveLength(boards.get("uno-r3")!.item.data.sources.length);
  });
});

describe("the report", () => {
  it("lists the third-party content of every project once", () => {
    for (const r of all()) expect(r.report.filter((x) => x.code === "third-party-unchecked")).toHaveLength(1);
  });

  it("records the English-only comments once for a lesson with translated comments", () => {
    const blink = lessons.get("uno-r3/blink")!.report;
    expect(blink.filter((x) => x.code === "code-comments-en-only")).toHaveLength(1);
  });

  it("names the parts and the board that have no descriptor", () => {
    expect(lessons.get("uno-r3/blink")!.report.filter((x) => x.code === "no-descriptor")).toEqual([]);
    expect(tours.get("pi4-pi5")!.report.find((x) => x.code === "no-descriptor")!.refs).toEqual(["core.pi4-pi5"]);
  });

  it("attaches a world input of a part outside the circuit to the board, and says so", () => {
    const unknown = reports().filter((x) => x.code === "unknown-part");
    expect(unknown.length).toBeGreaterThan(0);
    for (const item of unknown) expect(item.message).toMatch(/world input/);
    const parking = lessons.get("uno-r3/parking")!.project;
    expect(parking.simulation.world.inputs.some((i) => i.component === "brd_main")).toBe(true);
  });

  it("names the project on every item", () => {
    for (const [key, r] of lessons) for (const x of r.report) expect([x.project, x.item], key).toEqual([r.project.id, expect.stringContaining(key)]);
  });

  it("adds the segments the Basys 3 display check reads to the pinned board interface", () => {
    const { project, report } = lessons.get("basys3/display")!;
    const board = project.dependencies.components.find((c) => c.ref === "core.basys3")!;
    expect(board.interface.pins.some((p) => p.id === "DIG0_A")).toBe(true);
    expect(report.some((x) => x.code === "unresolved-endpoint" && x.refs?.includes("DIG0_A"))).toBe(true);
  });
});

describe("edge cases", () => {
  const uno = () => boards.get("uno-r3")!;
  const withLesson = (patch: Record<string, unknown>) => {
    const { item } = uno();
    return { ...item, data: { ...item.data, lessons: item.data.lessons.map((l) => (l.id === "blink" ? { ...l, ...patch } : l)) } } as typeof item;
  };

  it("reports a language the project has no name for and writes the closest one", () => {
    const { texts, circuits, ctx } = uno();
    const out = convertLesson(withLesson({ language: "rust" }), "blink", texts, circuits, ctx);
    expect(out.report.some((x) => x.code === "skipped" && x.refs?.includes("rust"))).toBe(true);
    expect(out.project.boards[0]!.firmware!.language).toBe("arduino-cpp");
  });

  it("uses the key as the English text of a missing key, and reports it", () => {
    const { item, texts, circuits, ctx } = uno();
    const title = item.data.lessons.find((l) => l.id === "blink")!.title;
    const en = Object.fromEntries(Object.entries(texts.en).filter(([key]) => key !== title));
    const out = convertLesson(item, "blink", { ...texts, en }, circuits, ctx);
    expect(out.project.guide!.title).toMatchObject({ en: title, de: texts.de[title] });
    expect(out.report.some((x) => x.code === "skipped" && x.refs?.includes(title))).toBe(true);
  });

  it("stops on a lesson id the board does not have", () => {
    const { item, texts, circuits, ctx } = uno();
    expect(() => convertLesson(item, "nope", texts, circuits, ctx)).toThrow("board/uno-r3 has no lesson");
  });

  it("reports a circuit the figure board lacks and writes the lesson without nets", () => {
    const { item, texts, ctx } = uno();
    const out = convertLesson(item, "blink", texts, {}, ctx);
    expect(out.report.some((x) => x.code === "skipped" && /circuit/.test(x.message))).toBe(true);
    expect(out.project.nets).toEqual([]);
    expect(validateValue(out.project).ok).toBe(true);
  });
});
