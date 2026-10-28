import { chainStart } from "./hash.ts";
import type { ComponentDependency, Project } from "./generated/types.ts";
import unoInterface from "./samples/uno-r3.interface.json" with { type: "json" };

export interface BlankOptions {
  board: "uno";
  title: string;
  locale: string;
  actor: string;
  /** Timestamp for `createdAt` and `updatedAt`. */
  now: string;
  /** Made by the caller with `newProjectId`: portable code draws no randomness. */
  id: string;
}

const UNO_REF = "core.uno-r3";
const UNO_VERSION = "1.0.0";
const WORLD_DEFAULT_SEED = 0x2545f491;

const BLINK = `void setup() {
  pinMode(LED_BUILTIN, OUTPUT);
  Serial.begin(9600);
}

void loop() {
  digitalWrite(LED_BUILTIN, HIGH);
  delay(500);
  digitalWrite(LED_BUILTIN, LOW);
  delay(500);
  Serial.println("blink");
}
`;

/**
 * A valid Uno project at revision 0 with a Blink sketch and no parts. It has no ground net, so it is not a run
 * sample: `buildSimNetlist` reports `no-ground` for it.
 */
export function blankProject(o: BlankOptions): Project {
  return {
    format: "iynk.project",
    schemaVersion: "1.1",
    id: o.id,
    revision: 0,
    meta: { title: o.title, kind: "project", locale: o.locale, createdAt: o.now, updatedAt: o.now },
    actors: [{ id: o.actor, name: "Owner" }],
    access: { owners: [o.actor], visibility: "private", grants: [], authority: "advisory" },
    boards: [
      {
        id: "brd_uno",
        definition: { ref: UNO_REF, version: UNO_VERSION },
        refdes: "U1",
        firmware: { language: "arduino-cpp", entry: "src_main", sources: ["src_main"], libraries: [] },
      },
    ],
    components: [],
    nets: [],
    views: [
      { id: "vw_bb", kind: "breadboard", name: "Breadboard", placements: [], wires: [] },
      { id: "vw_sch", kind: "schematic", name: "Schematic", placements: [], wires: [] },
    ],
    sources: [
      {
        id: "src_main",
        path: "main.ino",
        language: "arduino-cpp",
        role: "firmware",
        board: "brd_uno",
        content: BLINK,
      },
    ],
    simulation: {
      seed: WORLD_DEFAULT_SEED,
      duration_ms: 4000,
      runtimes: [{ id: "rtm_main", board: "brd_uno", engine: "iynk-interp" }],
      solver: { engine: "iynk-mna" },
      world: { inputs: [], script: [] },
      faults: [],
    },
    parameters: [],
    assets: [],
    dependencies: {
      components: [
        {
          ref: UNO_REF,
          version: UNO_VERSION,
          origin: "builtin",
          interface: JSON.parse(JSON.stringify(unoInterface)) as ComponentDependency["interface"],
        },
      ],
      libraries: [],
    },
    tests: [],
    history: { baseRevision: 0, baseChain: chainStart(o.id), checkpoints: [], ops: [] },
    provenance: { createdBy: o.actor, createdWith: { app: "iynk", version: "0.1.0" }, origin: { kind: "blank" } },
    license: { spdx: "LicenseRef-iynk-pending" },
  };
}
