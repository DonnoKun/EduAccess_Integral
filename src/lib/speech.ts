/** Voices that sound human on common devices (Edge "Online (Natural)", Apple Premium/Enhanced/Siri, Google). */
const NATURAL = /natural|neural|online|premium|enhanced|siri|wavenet|studio/i;
/** Old offline engines that sound robotic (eSpeak, classic Windows desktop voices). */
const ROBOTIC = /espeak|mbrola|festival|pico|^microsoft (david|zira|mark|hazel|george|susan|helena|laura|pablo|sabina|raul|irina)( desktop)?\b(?!.*(natural|online))/i;

/** Prefer natural voices supplied by the device; speech never invokes paid AI. */
export function selectSpeechVoice(voices: SpeechSynthesisVoice[], language: string) {
  const base = language.toLowerCase().split('-')[0];
  const target = base === 'es' ? 'es-es' : 'en-us';
  const regional = base === 'es' ? ['es-mx', 'es-us', 'es-419'] : ['en-gb'];
  return voices
    .filter((voice) => voice.lang.toLowerCase().replace('_', '-').split('-')[0] === base)
    .map((voice) => {
      const lang = voice.lang.toLowerCase().replace('_', '-');
      return { voice, score:
        (NATURAL.test(voice.name) ? 200 : /google/i.test(voice.name) ? 100 : 0) +
        (ROBOTIC.test(voice.name) ? -150 : 0) +
        (lang === target ? 20 : regional.includes(lang) ? 15 : 0) + (voice.default ? 5 : 0),
      };
    })
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