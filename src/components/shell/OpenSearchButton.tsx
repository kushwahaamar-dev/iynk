"use client";

import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/icons";
import { OPEN_COMMAND_EVENT } from "./CommandMenuHost";

/** Opens the command menu from a page that is not the nav bar. */
export function OpenSearchButton({ label }: { label: string }) {
  return (
    <Button variant="secondary" onClick={() => window.dispatchEvent(new CustomEvent(OPEN_COMMAND_EVENT))}>
      <Icon name="search" size={20} />
      {label}
    </Button>
  );
}
