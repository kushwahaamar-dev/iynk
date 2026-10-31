"use client";

import { Button, Icon, Menu, type MenuItem } from "@/components/ui";
import type { Messages } from "@/i18n/namespaces";

export interface ProjectMenuProps {
  strings: Messages["studio"];
  /** False when no board of the project runs an Arduino sketch. */
  canExportIno: boolean;
  /** False for a project opened read-only. */
  canImportIno: boolean;
  onSaveFile(): void;
  onExportIno(): void;
  onImportIno(): void;
  onExportCsv(): void;
  onOpenHistory(): void;
}

export function ProjectMenu({ strings, canExportIno, canImportIno, onSaveFile, onExportIno, onImportIno, onExportCsv, onOpenHistory }: ProjectMenuProps) {
  const items: MenuItem[] = [
    { id: "save", label: strings.projectMenu.saveFile, icon: "download", onSelect: onSaveFile },
    { id: "import", label: strings.ino.import, icon: "arrow-right", onSelect: onImportIno, disabled: !canImportIno },
    { id: "ino", label: strings.ino.export, icon: "code", onSelect: onExportIno, disabled: !canExportIno },
    { id: "csv", label: strings.ino.wiringCsv, icon: "link", onSelect: onExportCsv },
    { separator: true },
    { id: "history", label: strings.projectMenu.history, icon: "rotate-left", onSelect: onOpenHistory },
  ];

  return (
    <Menu
      label={strings.projectMenu.label}
      items={items}
      trigger={
        <Button variant="ghost" size="sm">
          {strings.projectMenu.label}
          <Icon name="chevron-down" size={16} aria-hidden="true" />
        </Button>
      }
    />
  );
}
