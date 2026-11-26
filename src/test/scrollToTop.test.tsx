import { describe, expect, it } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ScrollToTopButton, { SCROLL_TOP_THRESHOLD } from '../components/ScrollToTopButton';

describe('back to top button', () => {
  it('is hidden at the top and appears after scrolling down', () => {
    Object.defineProperty(window, 'scrollY', { value: 0, writable: true, configurable: true });
    render(<MemoryRouter><ScrollToTopButton /></MemoryRouter>);
    expect(screen.queryByRole('button')).toBeNull();
    act(() => { (window as { scrollY: number }).scrollY = SCROLL_TOP_THRESHOLD + 200; window.dispatchEvent(new Event('scroll')); });
    expect(screen.getByRole('button')).toBeTruthy();
    act(() => { (window as { scrollY: number }).scrollY = 0; window.dispatchEvent(new Event('scroll')); });
    expect(screen.queryByRole('button')).toBeNull();
  });
});
