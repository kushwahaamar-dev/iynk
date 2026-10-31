import { Chip, type ChipTone } from "@/components/ui";
import type { BuildCheck, BuildError, CheckResult } from "@/sim/flight/checks";
import type { DroneT } from "./SafetyNotice";

const ORDER: readonly CheckResult[] = ["fail", "warn", "info", "ok"];
const TONE: Record<CheckResult, ChipTone> = { fail: "bad", warn: "warn", info: "info", ok: "good" };

const byUrgency = (a: BuildCheck, b: BuildCheck) => ORDER.indexOf(a.result) - ORDER.indexOf(b.result);

function Reading({ value, unit, t }: { value: number | null; unit: string; t: DroneT }) {
  return <>{value === null ? t("numbers.na") : t("check.reading", { value, unit })}</>;
}

/** The build's checks, worst first. Each opens to its value, limit, formula and assumptions. */
export function ChecksList({ checks, errors, t }: { checks: readonly BuildCheck[]; errors: readonly BuildError[]; t: DroneT }) {
  const sorted = [...checks].sort(byUrgency);

  return (
    <section aria-labelledby="checks-title" className="flex flex-col gap-3">
      <h2 id="checks-title" className="text-lg font-semibold text-balance">
        {t("check.title")}
      </h2>
      {errors.length > 0 && (
        <ul className="flex flex-col gap-2">
          {errors.map((error) => (
            <li key={`${error.id}${error.path ?? ""}`} className="rounded-lg bg-bad-bg p-3 text-sm text-bad text-pretty">
              {t(error.message_key as Parameters<DroneT>[0], { path: error.path ?? "" })}
            </li>
          ))}
        </ul>
      )}
      {sorted.length === 0 ? (
        <p className="text-sm text-muted text-pretty">{t("check.none")}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {sorted.map((check) => (
            <li key={check.id}>
              <details className="rounded-lg bg-sunken p-3">
                <summary className="flex cursor-pointer items-center justify-between gap-2 text-base font-medium">
                  <span>{t(`check.${check.id}.name`)}</span>
                  <Chip tone={TONE[check.result]}>{t(`check.state.${check.result}`)}</Chip>
                </summary>
                <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
                  <dt className="text-muted">{t("check.value")}</dt>
                  <dd className="font-mono tabular-nums">
                    <Reading value={check.value} unit={check.unit} t={t} />
                  </dd>
                  <dt className="text-muted">{t("check.limit")}</dt>
                  <dd className="font-mono tabular-nums">
                    <Reading value={check.limit} unit={check.unit} t={t} />
                  </dd>
                  {check.limitingPart && (
                    <>
                      <dt className="text-muted">{t("check.part")}</dt>
                      <dd>{check.limitingPart}</dd>
                    </>
                  )}
                  <dt className="text-muted">{t("check.formula")}</dt>
                  <dd className="text-pretty">{check.formula}</dd>
                  {check.assumptions.length > 0 && (
                    <>
                      <dt className="text-muted">{t("check.assumptions")}</dt>
                      <dd>
                        <ul className="flex flex-col gap-1">
                          {check.assumptions.map((assumption) => (
                            <li key={assumption} className="text-pretty">
                              {assumption}
                            </li>
                          ))}
                        </ul>
                      </dd>
                    </>
                  )}
                </dl>
              </details>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
