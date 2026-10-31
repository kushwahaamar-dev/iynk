"use client";

import { useMemo } from "react";
import { FlyView, type FlyViewProps } from "@/components/dronelab/FlyView";
import { BuddyBoard } from "@/components/flight/BuddyBoard";
import { createTranslator } from "@/i18n/translate";

export function FlyPanel(props: FlyViewProps) {
  const { lang, flightMessages, content } = props;
  const flightT = useMemo(() => createTranslator(lang, flightMessages, "flight"), [lang, flightMessages]);
  return (
    <FlyView
      {...props}
      board={(slot) => (
        <BuddyBoard craftId={content.id} courseId={slot.courseId} courseLabel={slot.courseLabel} lang={lang} t={flightT} refreshKey={slot.refreshKey} />
      )}
    />
  );
}
