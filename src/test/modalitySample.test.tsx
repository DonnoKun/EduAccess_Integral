import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LearningModalitySample } from '@/components/LearningModalitySample';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ i18n: { language: 'en' } }) }));
afterEach(cleanup);

describe('automatic modality media preview shared by both roles', () => {
  it('starts mixed media automatically and allows pause and resume', () => {
    render(<LearningModalitySample modality="mixed" playing={false} onPlay={vi.fn()} onStop={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Pause animation' })).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(screen.getByRole('button', { name: 'Pause animation' }));
    expect(screen.getByRole('button', { name: 'Play animation' })).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(screen.getByRole('button', { name: 'Play animation' }));
    expect(screen.getByRole('button', { name: 'Pause animation' })).toHaveAttribute('aria-pressed', 'false');
  });
});