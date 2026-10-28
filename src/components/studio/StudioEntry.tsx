"use client";

import dynamic from "next/dynamic";
import type { ProjectListProps } from "./ProjectList";

const ProjectList = dynamic(() => import("./ProjectList").then((m) => m.ProjectList), {
  ssr: false,
  loading: () => <div className="min-h-64" aria-busy="true" />,
});

export function StudioEntry(props: Pick<ProjectListProps, "strings" | "lang">) {
  return <ProjectList {...props} />;
}
