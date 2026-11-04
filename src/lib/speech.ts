/** Prefer natural voices supplied by the device; speech never invokes paid AI. */
export function selectSpeechVoice(voices: SpeechSynthesisVoice[], language: string) {
  const base = language.toLowerCase().split('-')[0];
  const target = base === 'es' ? 'es-es' : 'en-us';
  return voices
    .filter((voice) => voice.lang.toLowerCase().split('-')[0] === base)
    .map((voice) => ({ voice, score:
      (/natural|neural|premium|enhanced/i.test(voice.name) ? 200 : /google/i.test(voice.name) ? 100 : 0) +
      (voice.lang.toLowerCase() === target ? 20 : 0) + (voice.default ? 5 : 0),
    }))
    .sort((a, b) => b.score - a.score)[0]?.voice;
}

export function waitForSpeechVoices(synth: SpeechSynthesis, timeout = 1500): Promise<SpeechSynthesisVoice[]> {
  const voices = synth.getVoices();
  if (voices.length) return Promise.resolve(voices);
  return new Promise((resolve) => {
    const finish = () => {
      clearTimeout(timer);
      synth.removeEventListener('voiceschanged', onChange);
      resolve(synth.getVoices());
    };
    const onChange = () => { if (synth.getVoices().length) finish(); };
    const timer = setTimeout(finish, timeout);
    synth.addEventListener('voiceschanged', onChange);
    onChange();
  });
}

export async function configureSpeech(utterance: SpeechSynthesisUtterance, language: string) {
  utterance.lang = language.startsWith('es') ? 'es-ES' : 'en-US';
  const voices = await waitForSpeechVoices(window.speechSynthesis);
  const voice = selectSpeechVoice(voices, utterance.lang);
  if (voice) utterance.voice = voice;
  utterance.pitch = 1;
}

export function warmSpeechVoices() {
  window.speechSynthesis?.getVoices();
}