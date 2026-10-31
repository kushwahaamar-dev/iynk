import type { FlightModelId } from "@/lib/flight/model-id";
import type { FlightStrings } from "./FlightRange";

/** Says which flight model the range is flying and what it can and cannot teach. */
export function ModelLabel({ model, t }: { model: FlightModelId; t: FlightStrings }) {
  return (
    <p className="text-sm text-muted" data-testid="model-label" data-model={model}>
      {model === "flight-game@1" ? t.model.game : t.model.rigid}
    </p>
  );
}
