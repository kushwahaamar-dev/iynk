import type { ReactNode } from "react";
import { Wrap, typeClass } from "@/components/editorial/Editorial";
import type { DashItem } from "@/components/shell/dashboard/data";
import { Reveal } from "@/components/ui";
import type { Locale } from "@/i18n/config";

export const REPO_URL = "https://github.com/kushwahaamar-dev/iynk";

export const WORKBENCH_HREF = "/boards/uno-r3";

/** The first lesson of the Uno R3 when the content has one, else the board page. */
export function workbenchHref(lang: Locale, uno?: DashItem): string {
  return uno?.entries[0]?.href ?? `/${lang}${WORKBENCH_HREF}`;
}

export function HomeSection({ id, title, children }: { id: string; title: ReactNode; children: ReactNode }) {
  const titleId = `${id}-title`;
  return (
    <section id={id} aria-labelledby={titleId} className="mt-16 md:mt-24">
      <Wrap>
        <Reveal>
          <h2 id={titleId} className={typeClass.title}>
            {title}
          </h2>
        </Reveal>
        {children}
      </Wrap>
    </section>
  );
}
