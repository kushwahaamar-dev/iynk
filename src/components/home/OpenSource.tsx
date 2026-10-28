import { ButtonLink } from "@/components/ui/Button";
import { Icon, type IconName } from "@/components/ui/icons";
import { Reveal } from "@/components/ui/Reveal";
import type { Locale } from "@/i18n/config";
import { getT } from "@/i18n/server";
import { HomeSection, REPO_URL } from "./primitives";

const LINKS: { key: "readme" | "selfHost" | "contribute"; icon: IconName; href: string }[] = [
  { key: "readme", icon: "github", href: `${REPO_URL}#readme` },
  { key: "selfHost", icon: "book", href: `${REPO_URL}/blob/main/docs/SELF_HOSTING.md` },
  { key: "contribute", icon: "book", href: `${REPO_URL}/blob/main/CONTRIBUTING.md` },
];

export async function OpenSource({ lang }: { lang: Locale }) {
  const t = await getT(lang, "home");
  return (
    <HomeSection id="open-source" title={t("open.title")}>
      <Reveal>
        <p className="mt-4 max-w-prose text-base text-muted">{t("open.text")}</p>
        <ul className="mt-8 flex flex-wrap gap-3">
          {LINKS.map((link) => (
            <li key={link.key}>
              <ButtonLink variant="secondary" size="sm" href={link.href} target="_blank" rel="noopener noreferrer">
                <Icon name={link.icon} size={16} aria-hidden />
                {t(`open.${link.key}`)}
                <Icon name="external" size={16} aria-hidden />
              </ButtonLink>
            </li>
          ))}
        </ul>
      </Reveal>
    </HomeSection>
  );
}
