import { describe, expect, it } from 'vitest';
import { selectSpeechVoice } from '../lib/speech';

const voice = (name: string, lang: string) => ({ name, lang, default: false }) as SpeechSynthesisVoice;
describe('natural narration for both roles', () => {
  it('prefers a natural English voice over a basic English voice', () => {
    const natural = voice('Microsoft Jenny Natural', 'en-US');
    expect(selectSpeechVoice([voice('Basic English', 'en-US'), natural], 'en')).toBe(natural);
  });
  it('keeps Spanish narration in Spanish', () => {
    const spanish = voice('Google español', 'es-ES');
    expect(selectSpeechVoice([voice('Jenny Natural', 'en-US'), spanish], 'es')).toBe(spanish);
  });
  it('does not select a voice in the wrong language', () => {
    expect(selectSpeechVoice([voice('Google español', 'es-ES')], 'en')).toBeUndefined();
  });
});