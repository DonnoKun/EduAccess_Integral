import { useLayoutEffect } from 'react';
import { useStore } from '@/store/useStore';
import type { BrightnessSensitivity, ContrastMode } from '@/types';

export function useOnboardingPreview(fontSize: number, lineSpacing: number, contrast: ContrastMode, animations: boolean, brightness: BrightnessSensitivity) {
  useLayoutEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-profile-preview', 'active');
    root.setAttribute('data-user-profile', 'active');
    root.style.setProperty('--profile-font-size', `${fontSize}px`);
    root.style.setProperty('--profile-line-height', String(lineSpacing));
    root.style.setProperty('--animation-duration', animations ? '300ms' : '0ms');
    root.classList.toggle('reduce-motion', !animations);
    root.classList.remove('light', 'dark', 'high-contrast', 'inverted');
    const theme = contrast === 'high' ? 'high-contrast' : contrast === 'inverted' ? 'inverted' : 'light';
    root.setAttribute('data-theme', theme);
    root.classList.add(theme);
    const value = { low: '1', medium: '0.85', high: '0.7' }[brightness];
    root.style.setProperty('--brightness-filter', value);
    root.style.filter = `brightness(${value})`;
    return () => {
      root.removeAttribute('data-profile-preview');
      root.style.removeProperty('--profile-font-size');
      root.style.removeProperty('--profile-line-height');
      root.style.removeProperty('--animation-duration');
      root.classList.remove('reduce-motion');
      useStore.getState().applyProfileStyles();
    };
  }, [fontSize, lineSpacing, contrast, animations, brightness]);
}