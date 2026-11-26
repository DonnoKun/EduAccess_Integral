import { describe, it, expect } from 'vitest';
import { lessonModality, syncModalityWithTTS } from '@/lib/lessonModality';

describe('lesson modality', () => {
  it('visual hides audio players', () => expect(lessonModality('visual', true).showAudio).toBe(false));
  it('voice switch off hides audio players', () => expect(lessonModality('mixed', false).showAudio).toBe(false));
  it('audio hides images', () => expect(lessonModality('audio', true).showImages).toBe(false));
  it('mixed shows both', () => expect(lessonModality('mixed', true)).toEqual({ showAudio: true, showImages: true }));
  it('turning voice off switches to visual', () => expect(syncModalityWithTTS('audio', false)).toBe('visual'));
  it('turning voice on from visual switches to mixed', () => expect(syncModalityWithTTS('visual', true)).toBe('mixed'));
});
