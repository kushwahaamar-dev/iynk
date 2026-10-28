"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import type { ProjectListProps } from "./ProjectList";

const ProjectList = dynamic(() => import("./ProjectList").then((m) => m.ProjectList), {
  ssr: false,
  loading: () => <div className="min-h-64" aria-busy="true" />,
});

const Diagnostics = dynamic(() => import("./Diagnostics").then((m) => m.Diagnostics), {
  ssr: false,
  loading: () => <div className="mt-4 min-h-32" aria-busy="true" />,
});

export function StudioEntry(props: Pick<ProjectListProps, "strings" | "lang">) {
  const [opened, setOpened] = useState(false);

  return (
    <>
      <ProjectList {...props} />
      <details
        className="mt-16 border-t border-rule pt-4"
        data-testid="diagnostics"
        onToggle={(e) => e.currentTarget.open && setOpened(true)}
      >
        <summary className="cursor-pointer text-base font-semibold">{props.strings.diag.title}</summary>
        {opened ? <Diagnostics strings={props.strings} lang={props.lang} /> : null}
      </details>
    </>
  );
}
