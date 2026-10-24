import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

// Next provides "server-only" itself; outside Next it is just a marker.
vi.mock("server-only", () => ({}));

// Without `globals: true` Testing Library cannot register its own cleanup.
afterEach(() => cleanup());
