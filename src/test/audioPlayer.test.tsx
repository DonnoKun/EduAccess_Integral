import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import AudioPlayer from '../components/AudioPlayer';

vi.mock('sonner', () => ({ toast: { success: vi.fn() } }));
vi.mock('@/lib/speech', () => ({ configureSpeech: vi.fn(async () => {}), warmSpeechVoices: vi.fn() }));
afterEach(cleanup);
describe('manual lesson reading', () => {
  it('keeps narration, all six speeds and current passage available for a visual-mode student', async () => {
    vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
    // A disabled automatic-TTS preference must not remove manual narration.
    localStorage.setItem('eduaccess-storage', JSON.stringify({ state: { visualProfile: { technicalParameters: { enableTTS: false } } } }));
    const speak = vi.fn((utterance: SpeechSynthesisUtterance) => utterance.onstart?.({} as SpeechSynthesisEvent));
    Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: { cancel: vi.fn(), speak, pause: vi.fn(), resume: vi.fn() } });
    vi.stubGlobal('SpeechSynthesisUtterance', class { text: string; constructor(text: string) { this.text = text; } });
    render(<AudioPlayer text="El dinero facilita los intercambios." lang="es" />);
    for (const rate of ['0.5x', '0.75x', '1x', '1.25x', '1.5x', '2x']) {
      expect(screen.getByRole('button', { name: rate })).toBeEnabled();
    }
    fireEvent.click(screen.getByRole('button', { name: /^Escuchar$/ }));
    await waitFor(() => expect(speak).toHaveBeenCalledOnce());
    expect(screen.getByText('Leyendo ahora', { exact: false })).toBeInTheDocument();
    expect(screen.getByText('El dinero facilita los intercambios.')).toBeInTheDocument();
    expect(screen.getByRole('slider', { name: 'Progreso de lectura' })).toBeInTheDocument();
  });
});