import { describe, it } from 'vitest';
import { checkSet } from './check-set';

const files = import.meta.glob('../../../content/projects/drones/a/*.project.json', { eager: true, import: 'default' });

describe('drones set A', () => {
  it('holds seven valid craft projects', () => {
    checkSet(files, { crafts: 7 });
  });
});
