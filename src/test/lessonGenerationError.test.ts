import { describe, expect, it } from 'vitest';
import { lessonGenerationError } from '@/lib/lessonGenerationError';

describe('lesson generation recovery', () => {
  it('extracts the server reason from a failed function response', async () => {
    const context = new Response(JSON.stringify({ code: 'GENERATION_TIMEOUT', error: 'No se pudo terminar la lección a tiempo.' }), { status: 504 });
    expect(await lessonGenerationError({ context }, 'Unavailable')).toBe('No se pudo terminar la lección a tiempo.');
    expect((await context.json()).code).toBe('GENERATION_TIMEOUT');
  });
  it('uses the safe fallback for a network failure', async () => {
    expect(await lessonGenerationError(new Error('Edge Function failed to send a request'), 'Servicio temporalmente no disponible')).toBe('Servicio temporalmente no disponible');
  });
  it('handles an empty error response without losing recovery', async () => {
    expect(await lessonGenerationError({ context: new Response('') }, 'Unavailable')).toBe('Unavailable');
  });
  it('does not expose the transport error shown in the screenshot', async () => {
    expect(await lessonGenerationError({ context: new Response(JSON.stringify({ error: 'Edge Function returned a non-2xx status code' })) }, 'Servicio temporalmente no disponible')).toBe('Servicio temporalmente no disponible');
  });
});