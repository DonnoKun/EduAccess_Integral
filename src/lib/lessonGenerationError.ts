/** Decode the service response instead of showing SDK transport jargon. */
export async function lessonGenerationError(error: unknown, fallback: string): Promise<string> {
  if (typeof error !== 'object' || error === null) return fallback;
  if ('context' in error && error.context instanceof Response) {
    try {
      const body: unknown = await error.context.clone().json();
      if (typeof body === 'object' && body !== null && 'error' in body && typeof body.error === 'string' && !/edge function|non-2xx/i.test(body.error)) return body.error;
    } catch { /* Network/empty responses use the localized fallback. */ }
  }
  return fallback;
}