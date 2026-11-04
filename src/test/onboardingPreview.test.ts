import { renderHook, cleanup } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useOnboardingPreview } from '../hooks/useOnboardingPreview';

const { restore } = vi.hoisted(() => ({ restore: vi.fn(() => {
  document.documentElement.style.setProperty('--profile-font-size', '48px');
  document.documentElement.style.setProperty('--profile-line-height', '3');
}) }));
vi.mock('@/store/useStore', () => ({ useStore: { getState: () => ({ applyProfileStyles: restore }) } }));
afterEach(() => { cleanup(); restore.mockClear(); });
describe('onboarding preview restoration for both roles', () => {
  it('activates the saved 48px preview immediately without touching a field', () => {
    renderHook(() => useOnboardingPreview(48, 3, 'high', false, 'high'));
    expect(document.documentElement.dataset.userProfile).toBe('active');
    expect(document.documentElement.style.getPropertyValue('--profile-font-size')).toBe('48px');
    expect(document.documentElement.style.getPropertyValue('--profile-line-height')).toBe('3');
    expect(document.documentElement.classList.contains('high-contrast')).toBe(true);
  });
  it('restores saved settings on leaving and reapplies preview on return', () => {
    const first = renderHook(() => useOnboardingPreview(20, 1.75, 'normal', true, 'low'));
    first.unmount();
    expect(restore).toHaveBeenCalledOnce();
    expect(document.documentElement.style.getPropertyValue('--profile-font-size')).toBe('48px');
    renderHook(() => useOnboardingPreview(48, 3, 'high', false, 'high'));
    expect(document.documentElement.dataset.profilePreview).toBe('active');
    expect(document.documentElement.style.filter).toBe('brightness(0.7)');
  });
});