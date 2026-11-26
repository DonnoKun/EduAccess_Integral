import type { PreferredModality } from '@/types';

/** What a lesson shows for the student's or teacher's preferred modality and voice switch. */
export function lessonModality(modality: PreferredModality | undefined, enableTTS: boolean | undefined) {
  const m = modality ?? 'mixed';
  return {
    showAudio: enableTTS !== false && m !== 'visual',
    showImages: m !== 'audio',
  };
}

/** Keeps the voice switch and the preferred modality consistent when either changes. */
export function syncModalityWithTTS(modality: PreferredModality, enableTTS: boolean): PreferredModality {
  if (!enableTTS && modality !== 'visual') return 'visual';
  if (enableTTS && modality === 'visual') return 'mixed';
  return modality;
}
