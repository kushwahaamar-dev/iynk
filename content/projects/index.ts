import type { Project } from '@/project/generated/types';
import type { TemplateEntry } from '@/project/guided/plan';
import { arduinoTemplates } from './boards/arduino';
import { espTemplates } from './boards/esp';
import { fpgaTemplates } from './boards/fpga';
import { otherTemplates } from './boards/other';

export const TEMPLATES: readonly TemplateEntry[] = [...arduinoTemplates, ...espTemplates, ...otherTemplates, ...fpgaTemplates];

export class TemplateNotFound extends Error {
  constructor(id: string) {
    super(`No template has the id ${id}`);
    this.name = 'TemplateNotFound';
  }
}

export function loadTemplate(id: string): Promise<Project> {
  const entry = TEMPLATES.find((template) => template.id === id);
  return entry ? entry.load() : Promise.reject(new TemplateNotFound(id));
}
