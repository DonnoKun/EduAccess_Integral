/** Prefer natural voices supplied by the device; speech never invokes paid AI. */
export function selectSpeechVoice(voices: SpeechSynthesisVoice[], language: string) {
  const base = language.toLowerCase().split('-')[0];
  const target = base === 'es' ? 'es-es' : 'en-us';
  return voices
    .filter((voice) => voice.lang.toLowerCase().split('-')[0] === base)
    .map((voice) => ({ voice, score:
      (/natural|neural|premium|enhanced|google/i.test(voice.name) ? 100 : 0) +
      (voice.lang.toLowerCase() === target ? 20 : 0) + (voice.default ? 5 : 0),
    }))
    .sort((a, b) => b.score - a.score)[0]?.voice;
}

export function configureSpeech(utterance: SpeechSynthesisUtterance, language: string) {
  utterance.lang = language.startsWith('es') ? 'es-ES' : 'en-US';
  const voice = selectSpeechVoice(window.speechSynthesis.getVoices(), utterance.lang);
  if (voice) utterance.voice = voice;
  utterance.pitch = 1;
}

export function warmSpeechVoices() {
  window.speechSynthesis?.getVoices();
}