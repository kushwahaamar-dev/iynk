import { diag } from "../core/result.ts";
import type { Diagnostic, Severity } from "../core/result.ts";
import { ORIGIN_OF_TRUST } from "./descriptor.ts";
import type { ValidateContext } from "./descriptor.ts";
import type { Component as Descriptor, Condition, ParamMap, Text } from "./generated/types.ts";

type Slot = "manufacturer" | "simulation" | "measured";
type Pick = "min" | "typ" | "max" | "value";

const SLOTS: readonly Slot[] = ["manufacturer", "simulation", "measured"];

const pointer = (...segments: (string | number)[]): string =>
  segments.map((s) => "/" + String(s).replace(/~/g, "~0").replace(/\//g, "~1")).join("");

/**
 * The cross-reference checks JSON Schema cannot express (COMPONENT_SCHEMA 6.1 to 6.5), ported from
 * `schemas/tools/semantic.mjs`. Expects a descriptor that already passed the schema. Each finding is one
 * `P-S-nn` error whose path points into the descriptor.
 */
export function semanticChecks(d: Descriptor, ctx?: ValidateContext): Diagnostic[] {
  const out: Diagnostic[] = [];
  const bad = (rule: string, path: string, message: string): void => {
    out.push(diag(`P-${rule}`, "error", path, message));
  };
  const report = (code: string, severity: Severity, path: string, message: string): void => {
    out.push(diag(code, severity, path, message));
  };

  const uniqueIds = (ids: readonly string[], list: string, what: string): Set<string> => {
    const seen = new Set<string>();
    ids.forEach((id, i) => {
      if (seen.has(id)) bad("S-01", pointer(list, i, "id"), `duplicate ${what} ${id}`);
      seen.add(id);
    });
    return seen;
  };

  const pins = uniqueIds(d.pins.map((p) => p.id), "pins", "pin id");
  const srcs = uniqueIds(d.sources.map((s) => s.id), "sources", "source id");
  const layers = uniqueIds(d.behaviour.layers.map((l) => l.id), "behaviour/layers", "layer id");
  const params = uniqueIds((d.parameters ?? []).map((p) => p.id), "parameters", "parameter id");
  const channels = new Set([...(d.physical_inputs ?? []), ...(d.physical_outputs ?? [])].map((c) => c.id));
  const nets = new Set(d.internal_nets ?? []);
  const protocols = new Set((d.protocols ?? []).map((p) => p.id));
  const connectors = new Set((d.connectors ?? []).map((c) => c.id));
  const ratings = d.ratings;

  const slotOf = (key: string) => ratings[key]?.used_by_model;
  const checkSrc = (ref: { src: string } | undefined, path: string): void => {
    if (ref && !srcs.has(ref.src)) bad("S-02", path, `unknown source ${ref.src}`);
  };
  const checkRating = (key: string | undefined, path: string): void => {
    if (key !== undefined && !(key in ratings)) bad("S-04", path, `unknown rating ${key}`);
  };
  const checkPin = (pin: string, path: string): void => {
    if (!pins.has(pin)) bad("S-01", path, `unknown pin ${pin}`);
  };
  const checkParameter = (id: string, path: string): void => {
    if (!params.has(id)) bad("S-09", path, `unknown parameter ${id}`);
  };
  const isKnown = (id: string): boolean =>
    protocols.has(id) || pins.has(id) || layers.has(id) || params.has(id) || channels.has(id) || nets.has(id);

  // loose: a rating no model reads (slot 'none') may still be named by a failure mode that is not a threshold.
  const hasMember = (key: string, pick: Pick, loose = false): boolean => {
    const rating = ratings[key];
    if (!rating) return false;
    const slot = rating.used_by_model;
    if (slot === "none") {
      if (!loose) return false;
      const q = rating.manufacturer ?? rating.simulation ?? rating.measured;
      return q?.[pick] !== undefined;
    }
    return rating[slot]?.[pick] !== undefined;
  };

  if (d.identity.primary_source && !srcs.has(d.identity.primary_source)) {
    bad("S-02", pointer("identity", "primary_source"), `unknown source ${d.identity.primary_source}`);
  }

  (d.connectors ?? []).forEach((c, i) =>
    c.pins.forEach((p, j) => checkPin(p, pointer("connectors", i, "pins", j))),
  );

  const board = d.dimensions?.board;
  d.pins.forEach((p, i) => {
    const at = pointer("pins", i);
    if (p.connector && !connectors.has(p.connector)) {
      bad("S-01", `${at}/connector`, `pin ${p.id}: unknown connector ${p.connector}`);
    }
    if (p.pull) {
      checkRating(p.pull.rating, `${at}/pull/rating`);
      if (p.pull.unless_parameter) checkParameter(p.pull.unless_parameter, `${at}/pull/unless_parameter`);
      if (p.pull.rail && !nets.has(p.pull.rail) && !pins.has(p.pull.rail)) {
        bad("S-08", `${at}/pull/rail`, `pin ${p.id}: unknown rail ${p.pull.rail}`);
      }
    }
    const pos = p.position;
    if (board && pos && (pos.x < 0 || pos.y < 0 || pos.x > board.w || pos.y > board.h)) {
      bad("S-11", `${at}/position`, `pin ${p.id} lies outside the board outline`);
    }
  });

  (d.groups ?? []).forEach((g, i) =>
    g.pins.forEach((p, j) => {
      if (!pins.has(p)) bad("S-01", pointer("groups", i, "pins", j), `group ${g.id}: unknown pin ${p}`);
    }),
  );

  for (const [key, rating] of Object.entries(ratings)) {
    if (!rating) continue;
    const at = pointer("ratings", key);
    for (const slot of SLOTS) checkSrc(rating[slot]?.source, `${at}/${slot}/source`);
    (rating.scope?.pins ?? []).forEach((p, i) => {
      if (!pins.has(p)) bad("S-03", `${at}/scope/pins/${i}`, `rating ${key}: unknown pin ${p}`);
    });
    const layer = rating.scope?.layer;
    if (layer && !layers.has(layer)) bad("S-03", `${at}/scope/layer`, `rating ${key}: unknown layer ${layer}`);
    (rating.simulation?.derived_from ?? []).forEach((ref, i) => {
      const [rk = "", slot = ""] = ref.split(".");
      const target = ratings[rk];
      if (!target || !SLOTS.includes(slot as Slot) || !target[slot as Slot]) {
        bad("S-03", `${at}/simulation/derived_from/${i}`, `rating ${key}: derived_from ${ref} does not exist`);
      }
    });
  }

  const usedElements = new Set<string>();

  const checkParams = (map: ParamMap | undefined, at: string): void => {
    for (const [name, v] of Object.entries(map ?? {})) {
      if (!v) continue;
      const here = `${at}/${name.replace(/~/g, "~0").replace(/\//g, "~1")}`;
      const pick: Pick = v.pick ?? "value";
      if (v.from_rating !== undefined) {
        const key = v.from_rating;
        checkRating(key, `${here}/from_rating`);
        if (!hasMember(key, pick)) {
          bad("S-05", here, `rating ${key} has no '${pick}' in the slot it is used from (${slotOf(key)})`);
        }
        const slot = slotOf(key);
        const unit = slot && slot !== "none" ? ratings[key]?.[slot]?.unit : undefined;
        if (v.unit && unit && v.unit !== unit) {
          bad("S-06", `${here}/unit`, `unit ${v.unit} differs from rating unit ${unit}`);
        }
      }
      if (v.by_parameter) {
        const { parameter, map: byValue } = v.by_parameter;
        checkParameter(parameter, `${here}/by_parameter/parameter`);
        for (const [value, key] of Object.entries(byValue)) {
          if (key === undefined) continue;
          const slotPath = `${here}/by_parameter/map/${value.replace(/~/g, "~0").replace(/\//g, "~1")}`;
          checkRating(key, slotPath);
          if (!hasMember(key, pick)) bad("S-05", slotPath, `rating ${key} lacks '${pick}'`);
        }
        for (const value of d.parameters?.find((p) => p.id === parameter)?.values ?? []) {
          if (!Object.hasOwn(byValue, String(value))) {
            bad("S-07", `${here}/by_parameter/map`, `parameter value ${value} has no mapping`);
          }
        }
      }
      checkSrc(v.source, `${here}/source`);
    }
  };

  d.behaviour.layers.forEach((layer, i) => {
    const at = pointer("behaviour", "layers", i);
    for (const field of ["reads", "drives"] as const) {
      (layer[field] ?? []).forEach((id, j) => {
        if (!isKnown(id)) bad("S-08", `${at}/${field}/${j}`, `layer ${layer.id}: unknown name ${id}`);
      });
    }
    const model = layer.model;
    const modelAt = `${at}/model`;
    switch (model.kind) {
      case "element":
        usedElements.add(model.element);
        for (const [terminal, pin] of Object.entries(model.terminals)) {
          if (pin !== undefined) checkPin(pin, `${modelAt}/terminals/${terminal}`);
        }
        checkParams(model.params, `${modelAt}/params`);
        break;
      case "subcircuit":
        model.instances.forEach((instance, j) => {
          if (instance.element) usedElements.add(instance.element);
          checkParams(instance.params, `${modelAt}/instances/${j}/params`);
        });
        break;
      case "builtin":
        if (ctx?.trust === "imported" && ctx.builtinRefs && !ctx.builtinRefs.has(model.ref)) {
          report("P-BUILTIN-UNKNOWN", "warning", `${modelAt}/ref`, `this iynk has no behaviour ${model.ref}; the layer will load as not modelled`);
        }
        checkParams(model.params, `${modelAt}/params`);
        break;
      case "extension":
        model.permissions.forEach((perm, j) => {
          const arg = perm.split(":")[1] ?? "";
          if (perm.startsWith("param.read:") && !params.has(arg)) {
            bad("S-13", `${modelAt}/permissions/${j}`, `extension permission ${perm}: unknown parameter`);
          }
          if (perm.startsWith("world.") && !channels.has(arg)) {
            bad("S-13", `${modelAt}/permissions/${j}`, `extension permission ${perm}: unknown channel`);
          }
        });
        break;
      default:
        break;
    }
  });

  const required = new Set<string>(d.simulation.solver_requires ?? []);
  for (const element of usedElements) {
    if (!required.has(element)) bad("S-10", pointer("simulation", "solver_requires"), `solver_requires lacks ${element}`);
  }
  if (ctx?.solverElements) {
    (d.simulation.solver_requires ?? []).forEach((element, i) => {
      if (!ctx.solverElements?.has(element)) {
        bad("S-10", pointer("simulation", "solver_requires", i), `the solver of this iynk has no element ${element}`);
      }
    });
  }

  (d.failure_modes ?? []).forEach((f, i) => {
    const at = pointer("failure_modes", i);
    f.when.forEach((c: Condition, j) => {
      const cond = `${at}/when/${j}`;
      if (!(c.target === "part" || pins.has(c.target) || layers.has(c.target))) {
        bad("S-09", `${cond}/target`, `failure ${f.id}: unknown target ${c.target}`);
      }
      const key = c.threshold.rating;
      if (key) {
        checkRating(key, `${cond}/threshold/rating`);
        const pick: Pick = c.threshold.pick ?? "value";
        if (!hasMember(key, pick, f.implemented_as !== "threshold")) {
          bad("S-05", `${cond}/threshold`, `failure ${f.id}: rating ${key} lacks '${pick}' in its used slot`);
        }
      }
    });
    checkSrc(f.source, `${at}/source`);
    if (f.implemented_as === "threshold" && f.basis === "manufacturer" && !f.source) {
      bad("S-02", at, `failure ${f.id}: manufacturer basis needs a source`);
    }
  });

  (d.injectable_faults ?? []).forEach((f, i) => {
    const at = pointer("injectable_faults", i, "target");
    (f.target?.pins ?? []).forEach((p, j) => {
      if (!pins.has(p)) bad("S-09", `${at}/pins/${j}`, `fault ${f.id}: unknown pin ${p}`);
    });
    if (f.target?.parameter && !params.has(f.target.parameter)) {
      bad("S-09", `${at}/parameter`, `fault ${f.id}: unknown parameter ${f.target.parameter}`);
    }
    if (f.target?.rail && !isKnown(f.target.rail)) bad("S-09", `${at}/rail`, `fault ${f.id}: unknown rail ${f.target.rail}`);
  });

  (d.parameters ?? []).forEach((p, i) =>
    (p.affects ?? []).forEach((a, j) => {
      if (!(isKnown(a) || a in ratings)) bad("S-08", pointer("parameters", i, "affects", j), `parameter ${p.id}: affects unknown ${a}`);
    }),
  );

  (d.protocols ?? []).forEach((proto, i) => {
    const at = pointer("protocols", i);
    for (const [role, pin] of Object.entries(proto.pins)) {
      if (pin !== undefined) checkPin(pin, `${at}/pins/${role}`);
    }
    checkRating(proto.speed_max, `${at}/speed_max`);
  });

  (d.power?.inputs ?? []).forEach((input, i) => {
    const at = pointer("power", "inputs", i);
    input.pins.forEach((p, j) => checkPin(p, `${at}/pins/${j}`));
    input.ground.forEach((p, j) => checkPin(p, `${at}/ground/${j}`));
    checkRating(input.voltage, `${at}/voltage`);
    checkRating(input.current, `${at}/current`);
  });
  (d.power?.outputs ?? []).forEach((output, i) => {
    const at = pointer("power", "outputs", i);
    checkPin(output.pin, `${at}/pin`);
    checkRating(output.dropout, `${at}/dropout`);
    checkRating(output.current_max, `${at}/current_max`);
  });
  (d.power?.consumption ?? []).forEach((c, i) => checkRating(c.rating, pointer("power", "consumption", i, "rating")));
  (d.power?.protection ?? []).forEach((p, i) => checkSrc(p.source, pointer("power", "protection", i, "source")));

  (d.compatibility?.rules ?? []).forEach((rule, i) => {
    const at = pointer("compatibility", "rules", i, "params");
    const q: Record<string, unknown> = rule.params;
    if (typeof q.pin === "string") checkPin(q.pin, `${at}/pin`);
    if (typeof q.limit_rating === "string") checkRating(q.limit_rating, `${at}/limit_rating`);
    if (typeof q.rating === "string") checkRating(q.rating, `${at}/rating`);
    if (typeof q.parameter === "string") checkParameter(q.parameter, `${at}/parameter`);
    if (typeof q.protocol === "string" && !protocols.has(q.protocol)) {
      bad("S-08", `${at}/protocol`, `rule ${rule.id}: unknown protocol ${q.protocol}`);
    }
  });

  (d.visual.breadboard?.legs ?? []).forEach((leg, i) => {
    if (!pins.has(leg)) bad("S-14", pointer("visual", "breadboard", "legs", i), `unknown pin ${leg}`);
  });

  (d.software?.environments ?? []).forEach((env, i) =>
    (env.libraries ?? []).forEach((lib, j) => checkSrc(lib.source, pointer("software", "environments", i, "libraries", j, "source"))),
  );
  (d.simulation.tests ?? []).forEach((t, i) => checkSrc(t.source, pointer("simulation", "tests", i, "source")));
  for (const [name, block] of Object.entries(d.mechanics ?? {})) {
    const source = (block as { source?: { src: string } } | undefined)?.source;
    checkSrc(source, pointer("mechanics", name, "source"));
  }

  if (d.simulation.status === "not-modelled-yet" && d.behaviour.layers.some((l) => l.model.kind !== "none")) {
    bad("S-10", pointer("simulation", "status"), "status is not-modelled-yet but a layer has a model");
  }

  const nonCore = ctx ? ctx.trust !== "core" : d.provenance.origin !== "core";
  if (nonCore) {
    const shape = (id: string, path: string): void => {
      if (!id.startsWith("x-") && !ctx?.causeIds?.has(id)) {
        bad("S-17", path, `id ${id} is not in the core registry and does not start with x-`);
      }
    };
    (d.failure_modes ?? []).forEach((f, i) => {
      shape(f.cause_id, pointer("failure_modes", i, "cause_id"));
      f.symptom_ids.forEach((s, j) => shape(s, pointer("failure_modes", i, "symptom_ids", j)));
    });
    (d.injectable_faults ?? []).forEach((f, i) => {
      shape(f.cause_id, pointer("injectable_faults", i, "cause_id"));
      f.symptom_ids.forEach((s, j) => shape(s, pointer("injectable_faults", i, "symptom_ids", j)));
    });
  }

  if (ctx) contextChecks(d, ctx, report);
  return out;
}

type Report = (code: string, severity: Severity, path: string, message: string) => void;

const quantityPicks = ["min", "typ", "max", "value"] as const;

function outsideManufacturer(d: Descriptor, key: string): boolean {
  const rating = d.ratings[key];
  const maker = rating?.manufacturer;
  const sim = rating?.simulation;
  if (!maker || !sim) return false;
  const low = maker.min ?? maker.value;
  const high = maker.max ?? maker.value;
  return quantityPicks.some((pick) => {
    const v = sim[pick];
    return typeof v === "number" && ((low !== undefined && v < low) || (high !== undefined && v > high));
  });
}

const mentionsMaker = (text: Text | undefined): boolean =>
  Object.values(text ?? {}).some((line) => typeof line === "string" && /manufacturer|data ?sheet/i.test(line));

function todoPaths(value: unknown, path: string, found: string[]): void {
  if (typeof value === "string") {
    if (value.includes("TODO")) found.push(path);
  } else if (Array.isArray(value)) {
    value.forEach((item, i) => todoPaths(item, `${path}/${i}`, found));
  } else if (value && typeof value === "object") {
    for (const [k, v] of Object.entries(value)) todoPaths(v, `${path}/${k.replace(/~/g, "~0").replace(/\//g, "~1")}`, found);
  }
}

/** The rules that depend on who is asking and on what the app has installed. */
function contextChecks(d: Descriptor, ctx: ValidateContext, report: Report): void {
  const error = (code: string, path: string, message: string): void => report(code, "error", path, message);

  const key = `${d.id}@${d.version}`;
  const installed = ctx.installed?.get(key);
  if (installed !== undefined && ctx.candidateDigest !== undefined && installed !== ctx.candidateDigest) {
    error("P-S-15", "/version", `${key} is already installed with other bytes (installed ${installed}, this file ${ctx.candidateDigest})`);
  }

  for (const rating of Object.keys(d.ratings)) {
    if (outsideManufacturer(d, rating) && !mentionsMaker(d.ratings[rating]?.simulation?.rationale)) {
      report("P-S-12", "warning", pointer("ratings", rating, "simulation"), `rating ${rating}: the simulation value lies outside the manufacturer range and the rationale does not say why`);
    }
  }

  if (d.simulation.tier === "none" && d.behaviour.layers.some((l) => l.model.kind !== "none")) {
    error("P-STATUS-LAYERS", "/simulation/tier", "tier is none but a layer has a model");
  }

  if (!d.provenance.license.trim()) error("P-LICENSE", "/provenance/license", "the part has no licence");

  const todos: string[] = [];
  todoPaths(d, "", todos);
  for (const path of todos) error("P-TODO", path, "this text is still a TODO");

  const expected = ORIGIN_OF_TRUST[ctx.trust];
  if (d.provenance.origin !== expected) {
    error("P-TRUST-ORIGIN", "/provenance/origin", `a ${ctx.trust} part must have origin ${expected}, not ${d.provenance.origin}`);
  }

  (d.simulation.tests ?? []).forEach((t, i) => {
    if (t.state === "to-write") {
      report("P-TEST-TO-WRITE", ctx.trust === "core" ? "error" : "warning", pointer("simulation", "tests", i, "state"), `test ${t.id} is still to be written`);
    }
  });
}
