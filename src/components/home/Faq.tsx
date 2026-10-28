import { Reveal } from "@/components/ui";
import type { Messages } from "@/i18n/namespaces";
import type { Translate } from "@/i18n/translate";
import { faqJsonLdScript } from "./faq-schema";
import { HomeSection } from "./primitives";

const QUESTIONS = ["1", "2", "3", "4", "5", "6", "7", "8"] as const;

export function Faq({ t }: { t: Translate<Messages["home"]> }) {
  const pairs = QUESTIONS.map((n) => ({ id: n, q: t(`faq.${n}.q`), a: t(`faq.${n}.a`) }));
  return (
    <HomeSection id="faq" title={t("faq.title")}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: faqJsonLdScript(pairs) }} />
      <div className="mt-8">
        {pairs.map(({ id, q, a }) => (
          <Reveal key={id} className="grid gap-2 border-t border-rule py-6 lg:grid-cols-2 lg:gap-6">
            <h3 className="text-lg font-semibold text-balance">{q}</h3>
            <p className="max-w-prose text-base text-muted text-pretty">{a}</p>
          </Reveal>
        ))}
      </div>
    </HomeSection>
  );
}
