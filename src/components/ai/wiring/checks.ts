import type { CheckPort, RuleFinding } from "@/ai/proposals/ports";
import { buildSimNetlist } from "@/sim-host";
import type { SimHost } from "@/sim-host/host";
import { builtinRegistry } from "@/parts/builtin";
import type { PartRegistry } from "@/parts/registry";
import type { Finding } from "@/sim/faults/types";

export type CompilePort = CheckPort["compile"];

export interface CheckDeps {
  sim: Pick<SimHost, "staticCheck">;
  /** The compile service, when the deployment has one. */
  compile?: CompilePort;
  reg?: Pick<PartRegistry, "get">;
}

/** Keeps what the card and the model need. The cause and the evidence stay inside the fault tools. */
function toRuleFinding(finding: Finding): RuleFinding {
  const { ruleId, severity, targets, messageKey, args } = finding;
  const detail = Object.values(args).join(" ");
  return { ruleId, severity, targets: targets.map((target) => target.id), text: detail === "" ? messageKey : `${messageKey} ${detail}` };
}

/**
 * Rules run in the sim worker. There is no test runner or short run behind the port yet: tests come back as
 * `not-run` and `run` fails, which the dry run reads as "no run to show".
 */
export function createCheckPort({ sim, compile, reg = builtinRegistry() }: CheckDeps): CheckPort {
  return {
    async rules(state) {
      const { net } = buildSimNetlist(state, reg);
      const sources = Object.fromEntries(state.sources.map((source) => [source.path, source.content]));
      const result = await sim.staticCheck(net, sources);
      return result.note === undefined ? result.findings.map(toRuleFinding) : [];
    },
    compile: compile ?? (async () => ({ skipped: "no compiler" })),
    async tests(_state, ids) {
      return (ids === "visible" ? [] : ids).map((id) => ({ id, visible: true, result: "not-run" as const }));
    },
    run() {
      return Promise.reject(new Error("no short run service"));
    },
  };
}
