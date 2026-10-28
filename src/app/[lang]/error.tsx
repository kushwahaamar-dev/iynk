"use client";

import { Button, ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { useCommonT, useLocale } from "@/i18n/client";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useCommonT();
  const locale = useLocale();

  return (
    <EmptyState
      icon="warn-circle"
      title={t("error.title")}
      className="py-24"
      action={
        <div className="flex flex-wrap justify-center gap-3">
          <Button variant="primary" onClick={reset}>
            {t("state.retry")}
          </Button>
          <ButtonLink variant="secondary" href={`/${locale}`}>
            {t("error.home")}
          </ButtonLink>
        </div>
      }
    >
      <p>{t("error.text")}</p>
      {error.digest ? <p className="mt-4 text-sm tabular-nums">{t("error.reference", { digest: error.digest })}</p> : null}
    </EmptyState>
  );
}
