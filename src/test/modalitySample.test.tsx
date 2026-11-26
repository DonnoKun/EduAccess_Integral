import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LearningModalitySample } from '@/components/LearningModalitySample';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ i18n: { language: 'en' } }) }));
afterEach(cleanup);

describe('modality sample shared by both roles', () => {
  it('shows a still illustration with no animation controls', () => {
    render(<LearningModalitySample modality="mixed" playing={false} onPlay={vi.fn()} onStop={vi.fn()} />);
    expect(screen.getByRole('img')).toBeTruthy();
    expect(screen.queryByRole('button', { name: /animation/i })).toBeNull();
    expect(screen.getByRole('button', { name: 'Listen to sample' })).toBeTruthy();
  });
});
