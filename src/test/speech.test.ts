import { describe, expect, it } from 'vitest';
import { selectSpeechVoice, waitForSpeechVoices } from '../lib/speech';

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
  it('prefers enhanced Spanish over standard Google Spanish', () => {
    const natural = voice('Microsoft Elvira Natural', 'es-ES');
    expect(selectSpeechVoice([voice('Google español', 'es-ES'), natural], 'es')).toBe(natural);
  });
  it('waits for device voices instead of immediately using the robotic default', async () => {
    const events = new EventTarget();
    let available: SpeechSynthesisVoice[] = [];
    const synth = Object.assign(events, { getVoices: () => available }) as unknown as SpeechSynthesis;
    const ready = waitForSpeechVoices(synth);
    const natural = voice('Jenny Natural', 'en-US');
    available = [natural];
    events.dispatchEvent(new Event('voiceschanged'));
    expect(await ready).toEqual([natural]);
  });
  it('falls back without hanging when the device supplies no voices', async () => {
    const synth = Object.assign(new EventTarget(), { getVoices: () => [] }) as unknown as SpeechSynthesis;
    expect(await waitForSpeechVoices(synth, 5)).toEqual([]);
  });
});