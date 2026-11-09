import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ signOut: vi.fn(), removeItem: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { auth: { signOut: mocks.signOut }, supabaseUrl: 'https://test.supabase.co' },
}));
vi.mock('@/integrations/supabase/previewAuthStorage', () => ({
  brokeredPreviewStorage: () => ({ removeItem: mocks.removeItem }),
}));
import { useAuthStore } from '@/store/useAuthStore';
import { useStore } from '@/store/useStore';

describe('logout for both roles', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mocks.signOut.mockReset();
    mocks.removeItem.mockReset().mockResolvedValue(undefined);
  });
  afterEach(() => vi.useRealTimers());

  it.each(['student', 'teacher'] as const)('%s waits for session removal before redirecting', async (role) => {
    useAuthStore.setState({ role, currentUser: { id: 'user', email: 'user@example.test', name: 'User' }, isAuthenticated: true });
    let finish: ((result: { error: null }) => void) | undefined;
    mocks.signOut.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
    const pending = useAuthStore.getState().logout();
    await vi.advanceTimersByTimeAsync(101);
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
    finish?.({ error: null });
    await pending;
    expect(mocks.signOut).toHaveBeenCalledWith({ scope: 'local' });
    expect(mocks.removeItem).toHaveBeenCalledWith('sb-test-auth-token');
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(useAuthStore.getState().role).toBeNull();
    expect(useStore.getState().visualProfile).toBeNull();
    expect(useStore.getState().recentSearches).toEqual([]);
  });
});