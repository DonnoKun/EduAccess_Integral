/** Runtime-independent approval boundary, shared by server validation and tests. */
export interface TopicVerdict { educational: boolean; reason: string; suggestions: string[] }
export class TopicValidationUnavailable extends Error {
  constructor() { super('Educational topic validation unavailable'); }
}
export function topicValidationMessage(language: string) {
  return language === 'en'
    ? 'The educational topic could not be verified. No lesson or images were generated. Please try again later.'
    : 'No se pudo verificar si el tema es educativo. No se generó ninguna lección ni imagen. Inténtalo más tarde.';
}
export async function educationalApproval(readCache: () => Promise<unknown>, classify: () => Promise<unknown>): Promise<TopicVerdict> {
  try {
    const response = await readCache() || await classify();
    const raw = response as { choices?: { message?: { tool_calls?: { function?: { arguments?: string } }[] } }[] } | null;
    const args = raw?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    if (!args) throw new TopicValidationUnavailable();
    const verdict: unknown = JSON.parse(args);
    if (typeof verdict !== 'object' || verdict === null || !('educational' in verdict) || typeof verdict.educational !== 'boolean' || !('reason' in verdict) || typeof verdict.reason !== 'string' || !('suggestions' in verdict) || !Array.isArray(verdict.suggestions) || !verdict.suggestions.every((s: unknown) => typeof s === 'string')) throw new TopicValidationUnavailable();
    return { educational: verdict.educational, reason: verdict.reason, suggestions: verdict.suggestions.slice(0, 5) };
  } catch { throw new TopicValidationUnavailable(); }
}