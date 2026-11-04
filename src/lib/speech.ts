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

/** Guess the language of the text itself so a Spanish lesson is never read by an English voice (and vice versa). */
export function detectTextLanguage(text: string, fallback: string): 'es' | 'en' {
  const words = text.toLowerCase().match(/[a-záéíóúñü]+/g)?.slice(0, 400) ?? [];
  const es = /^(el|la|los|las|de|que|y|en|un|una|es|por|con|para|del|se|al|como|más|su|lo)$/;
  const en = /^(the|and|of|to|is|in|that|it|for|with|as|are|on|this|be|by|an|from|or|was)$/;
  let a = 0, b = 0;
  for (const w of words) { if (es.test(w)) a++; else if (en.test(w)) b++; }
  if (/[ñáéíóú¿¡]/.test(text)) a += 3;
  if (a + b < 4) return fallback.startsWith('es') ? 'es' : 'en';
  return a >= b ? 'es' : 'en';
}

export async function configureSpeech(utterance: SpeechSynthesisUtterance, language: string) {
  const detected = utterance.text ? detectTextLanguage(utterance.text, language) : (language.startsWith('es') ? 'es' : 'en');
  utterance.lang = detected === 'es' ? 'es-ES' : 'en-US';
  const voices = await waitForSpeechVoices(window.speechSynthesis, 3000);
  const voice = selectSpeechVoice(voices, utterance.lang);
  if (voice) utterance.voice = voice;
  utterance.pitch = 1;
}

export function warmSpeechVoices() {
  window.speechSynthesis?.getVoices();
}