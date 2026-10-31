import type { ReactNode } from "react";
import type { Messages } from "@/i18n/namespaces";
import type { Translate } from "@/i18n/translate";
import { Reveal } from "@/components/ui";
import { Icon } from "@/components/ui/icons";
import { HomeSection } from "./primitives";

const POINTS = ["1", "2", "3"] as const;

function Column({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-2xl bg-surface p-6 md:p-8">
      <h3 className="text-xl font-semibold text-balance">{title}</h3>
      <ul className="mt-6 flex flex-col gap-4">{children}</ul>
    </div>
  );
}

function Point({ icon, children }: { icon: "check-circle" | "info"; children: string }) {
  return (
    <li className="flex items-start gap-3 text-base">
      <Icon name={icon} size={20} className={icon === "check-circle" ? "mt-0.5 shrink-0 text-good" : "mt-0.5 shrink-0 text-muted"} />
      <span className="max-w-prose text-pretty">{children}</span>
    </li>
  );
}

export function Proof({ t }: { t: Translate<Messages["home"]> }) {
  return (
    <HomeSection id="proof" title={t("proof.title")}>
      <Reveal className="mt-8 grid gap-6 md:grid-cols-2">
        <Column title={t("proof.runs.title")}>
          {POINTS.map((n) => (
            <Point key={n} icon="check-circle">
              {t(`proof.runs.${n}`)}
            </Point>
          ))}
        </Column>
        <Column title={t("proof.sim.title")}>
          {POINTS.map((n) => (
            <Point key={n} icon="info">
              {t(`proof.sim.${n}`)}
            </Point>
          ))}
        </Column>
      </Reveal>
      <Reveal delay={60}>
        <blockquote className="mt-6 rounded-2xl bg-sunken p-6 text-lg text-pretty md:p-8">
          <p className="max-w-prose">{t("proof.fidelity")}</p>
        </blockquote>
      </Reveal>
    </HomeSection>
  );
}
