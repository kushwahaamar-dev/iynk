import { Chip } from "@/components/ui";
import { formatNumber } from "@/components/dronelab/text";
import type { Locale } from "@/i18n/config";
import { tileDigits } from "@/lib/drone/calc";
import { logError } from "@/lib/telemetry";
import type { BuildOutputs, OutputId } from "@/sim/flight/evaluate";
import { SafetyNotice, type DroneT } from "./SafetyNotice";

type Tile = {
  id: string;
  label: Parameters<DroneT>[0];
  output: OutputId;
  value: string | null;
  banded: boolean;
};

const SECONDS_PER_MINUTE = 60;
const PERCENT = 100;

function bandKind(band: BuildOutputs["band"]): "fit" | "outside" | "none" {
  if (band.basis === "no-fit" || band.rel === null) return "none";
  return band.inside ? "fit" : "outside";
}

/** Every number the build gives, with its unit, tier and error band; an output that cannot be computed says what it lacks. */
export function NumbersPanel({ out, lang, t }: { out: BuildOutputs; lang: Locale; t: DroneT }) {
  const n = (value: number, digits: number) => formatNumber(lang, value, digits);
  const show = (value: number | null, digits: number, unit: "g" | "ratio" | "pct" | "a", scale = 1): string | null => {
    if (value === null) return null;
    if (!Number.isFinite(value)) {
      logError("drone.numbers", "non-finite value");
      return t("numbers.na");
    }
    return t(`numbers.unit.${unit}`, { value: n(value * scale, digits) });
  };

  const e = out.endurance;
  const range =
    e && Number.isFinite(e.low_s) && Number.isFinite(e.high_s)
      ? t("numbers.range", {
          low: n(e.low_s / SECONDS_PER_MINUTE, tileDigits.flyMin),
          high: n(e.high_s / SECONDS_PER_MINUTE, tileDigits.flyMin),
        })
      : e
        ? t("numbers.na")
        : null;

  const tiles: Tile[] = [
    { id: "auw", label: "numbers.auw", output: "mass", value: show(out.auw_g, tileDigits.auw, "g"), banded: false },
    { id: "thrust", label: "numbers.thrust", output: "thrust", value: show(out.thrustPerMotor_g, tileDigits.auw, "g"), banded: true },
    { id: "tw", label: "numbers.tw", output: "hover", value: show(out.tw, tileDigits.tw, "ratio"), banded: true },
    {
      id: "hoverThrottle",
      label: "numbers.hoverThrottle",
      output: "hover",
      value: show(out.hoverThrottle, tileDigits.hoverThrPercent, "pct", PERCENT),
      banded: true,
    },
    { id: "hoverAmps", label: "numbers.hoverAmps", output: "hover", value: show(out.hoverAmps, tileDigits.maxA, "a"), banded: true },
    { id: "maxAmps", label: "numbers.maxAmps", output: "current", value: show(out.maxAmps, tileDigits.maxA, "a"), banded: true },
    { id: "endurance", label: "numbers.endurance", output: "endurance", value: range, banded: true },
  ];

  const kind = bandKind(out.band);
  const short = kind === "fit" ? t("band.short.fit", { value: n((out.band.rel ?? 0) * PERCENT, 0) }) : t(`band.short.${kind}`);
  const missing = (output: OutputId) => out.blocked.find((b) => b.output === output)?.needs.map((need) => need.path) ?? [];

  return (
    <section aria-labelledby="numbers-title" className="flex flex-col gap-4">
      <h2 id="numbers-title" className="text-lg font-semibold text-balance">
        {t("numbers.title")}
      </h2>
      <dl className="grid gap-x-4 gap-y-3 sm:grid-cols-2">
        {tiles.map((tile) => {
          const paths = tile.value === null ? missing(tile.output) : [];
          return (
            <div key={tile.id} className="flex flex-col gap-1 rounded-lg bg-sunken p-3">
              <dt className="flex items-center justify-between gap-2 text-sm text-muted">
                {t(tile.label)}
                <Chip>{out.tier}</Chip>
              </dt>
              <dd className="font-mono text-lg font-semibold tabular-nums">
                {tile.value ?? t("numbers.na")}
              </dd>
              {tile.value === null ? (
                <dd className="text-sm text-muted text-pretty">
                  {paths.length > 0 ? t("numbers.missing", { paths: paths.join(", ") }) : t("numbers.notYet")}
                </dd>
              ) : tile.banded ? (
                <dd className="text-sm text-muted text-pretty">{short}</dd>
              ) : null}
            </div>
          );
        })}
      </dl>
      <p className="text-sm text-muted text-pretty">{t(`band.${kind}`)}</p>
      <SafetyNotice id="SN-8" t={t} />
    </section>
  );
}
