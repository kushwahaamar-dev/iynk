import { Wrap } from "@/components/editorial/Editorial";
import { ButtonLink } from "@/components/ui/Button";
import { Reveal } from "@/components/ui/Reveal";
import type { Locale } from "@/i18n/config";
import { getT } from "@/i18n/server";

export async function FinalCta({ lang, href }: { lang: Locale; href: string }) {
  const t = await getT(lang, "home");
  return (
    <section aria-labelledby="end-title" className="my-16 md:my-24">
      <Wrap>
        <Reveal>
          <div className="flex flex-col items-start gap-6 rounded-2xl bg-surface p-8 md:p-12">
            <h2 id="end-title" className="text-4xl font-semibold tracking-tight text-balance lang-air">
              {t("end.title")}
            </h2>
            <p className="max-w-prose text-base text-muted">{t("end.text")}</p>
            <ButtonLink variant="primary" href={href} prefetch={false}>
              {t("end.cta")}
            </ButtonLink>
          </div>
        </Reveal>
      </Wrap>
    </section>
  );
}
