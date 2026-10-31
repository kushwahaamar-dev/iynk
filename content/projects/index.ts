import type { Project } from '@/project/generated/types';
import type { TemplateEntry } from '@/project/guided/plan';
import { arduinoTemplates } from './boards/arduino';
import { espTemplates } from './boards/esp';
import { fpgaTemplates } from './boards/fpga';
import { otherTemplates } from './boards/other';
import { TEMPLATES as roboticsA } from './robotics/a';
import { TEMPLATES as roboticsB } from './robotics/b';
import { TEMPLATES as dronesA } from './drones/a';
import { TEMPLATES as dronesB } from './drones/b';

export const TEMPLATES: readonly TemplateEntry[] = [...arduinoTemplates, ...espTemplates, ...otherTemplates, ...fpgaTemplates];

/** A lab template: a robotics bench or practice task, or a drone craft. Kept apart from `TemplateEntry`, whose kinds are board lessons. */
export interface LabTemplateEntry {
  id: string;
  /** LocalizedText of the project's guide title, so the gallery loads no file. */
  title: Record<string, string>;
  lab: 'robotics' | 'drone';
  kind: 'bench' | 'craft' | 'task';
  /** The bench a task belongs to; null for a bench and a craft. */
  bench: string | null;
  board: string | null;
  order: number;
  stepCount: number;
  catalogue: { lab: 'robotics' | 'drone'; id: string; child: string | null };
  load(): Promise<Project>;
}

export const LAB_TEMPLATES: readonly LabTemplateEntry[] = [...roboticsA, ...roboticsB, ...dronesA, ...dronesB];

export class TemplateNotFound extends Error {
  constructor(id: string) {
    super(`No template has the id ${id}`);
    this.name = 'TemplateNotFound';
  }
}

export function loadTemplate(id: string): Promise<Project> {
  const entry = TEMPLATES.find((template) => template.id === id) ?? LAB_TEMPLATES.find((template) => template.id === id);
  return entry ? entry.load() : Promise.reject(new TemplateNotFound(id));
}
