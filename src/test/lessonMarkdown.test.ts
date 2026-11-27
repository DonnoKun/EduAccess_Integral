import { describe, it, expect } from 'vitest';
import { stripMarkdown } from '@/lib/lessonMarkdown';
describe('formato de lecciones', () => {
  it('quita asteriscos simples y dobles de la narración', () => {
    expect(stripMarkdown('El **replay** (*forward replay*) ### x')).toBe('El replay (forward replay) ### x');
    expect(stripMarkdown('### Título\n- **Estrato:** texto')).toBe('Título\nEstrato: texto');
  });
});
