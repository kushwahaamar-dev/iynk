import { render, screen } from "@testing-library/react";
import { StrictMode } from "react";
import { describe, expect, it, vi } from "vitest";
import { createMemoryRepository } from "@/local/memory-repository";
import { createProjectHandler } from "@/local/project-handler";
import { createProjectHost } from "@/local/project-host";
import { createShadow } from "@/local/shadow";
import { createInlinePort } from "@/protocol";
import { createSimHost } from "@/sim-host/host";
import { createServices, ServicesProvider, useServices, type Services } from "./services";

function makeServices(): Services {
  const host = createProjectHost({
    makePort: () => createInlinePort(createProjectHandler({ repo: createMemoryRepository(), shadowFactory: createShadow, clock: () => 1_790_000_000_000 })),
  });
  const sim = createSimHost({ makePort: () => ({ call: vi.fn(), on: vi.fn(), kill: vi.fn(async () => undefined), state: "ready" }) as never });
  vi.spyOn(host, "kill");
  vi.spyOn(sim, "kill");
  return createServices({ host, sim });
}

describe("services provider", () => {
  it("hands two consumers the identical objects", () => {
    const seen: Services[] = [];
    const Probe = () => {
      seen.push(useServices());
      return null;
    };
    render(
      <ServicesProvider factory={makeServices}>
        <Probe />
        <Probe />
      </ServicesProvider>,
    );
    expect(seen.length).toBeGreaterThanOrEqual(2);
    expect(seen.every((s) => s === seen[0])).toBe(true);
    expect(seen[0].library).toBe(seen[0].host.library);
  });

  it("kills the host and the sim host once on unmount", () => {
    let made!: Services;
    const factory = () => (made = makeServices());
    const { unmount } = render(
      <ServicesProvider factory={factory}>
        <span>in</span>
      </ServicesProvider>,
    );
    unmount();
    expect(made.host.kill).toHaveBeenCalledTimes(1);
    expect(made.sim.kill).toHaveBeenCalledTimes(1);
  });

  it("leaves one live set under Strict Mode", () => {
    const sets: Services[] = [];
    const factory = () => {
      const s = makeServices();
      sets.push(s);
      return s;
    };
    render(
      <StrictMode>
        <ServicesProvider factory={factory}>
          <span>in</span>
        </ServicesProvider>
      </StrictMode>,
    );
    const killed = sets.filter((s) => vi.mocked(s.host.kill).mock.calls.length === 1);
    expect(sets.length - killed.length).toBe(1);
    expect(sets.at(-1)!.host.kill).not.toHaveBeenCalled();
  });

  it("throws outside a provider", () => {
    const Probe = () => {
      useServices();
      return <span>never</span>;
    };
    const quiet = vi.spyOn(console, "error").mockImplementation(() => undefined);
    expect(() => render(<Probe />)).toThrow(/ServicesProvider/);
    quiet.mockRestore();
    expect(screen.queryByText("never")).toBeNull();
  });

  it("loads a project created through the library and reports a missing id", async () => {
    const { host, library } = makeServices();
    const id = await library.create({ board: "uno" });
    expect(await host.load(id)).toMatchObject({ status: "ok" });
    expect(await host.load("prj_missing")).toMatchObject({ status: "missing" });
  });
});
