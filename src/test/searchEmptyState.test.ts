import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  invoke: vi.fn(),
  rpc: vi.fn(),
  insert: vi.fn(),
  upsert: vi.fn(),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: { getUser: () => Promise.resolve({ data: { user: null } }) },
    functions: { invoke: mocks.invoke },
    rpc: mocks.rpc,
    from: () => ({ insert: mocks.insert, upsert: mocks.upsert }),
  },
}));

const lessonResult = {
  id: 'res-1',
  title: 'Los perros',
  description: 'Introducción a los perros.',
  url: 'https://example.test/perros',
  source: 'wikipedia',
  contentType: 'article',
  educationLevel: 'elementary',
  accessibilityStatus: 'accessible',
  metadata: { tags: ['perros'] },
};

describe('search empty state before and after a real search', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv('VITE_SUPABASE_URL', 'https://test.supabase.co');
    localStorage.clear();
    mocks.invoke.mockReset().mockResolvedValue({
      data: { success: true, results: [lessonResult], suggestions: [], noResultsReason: null },
    });
    mocks.rpc.mockReset().mockResolvedValue({ data: null });
    mocks.insert.mockReset().mockResolvedValue({ error: null });
    mocks.upsert.mockReset().mockResolvedValue({ error: null });
  });

  it('starts without having searched, so the page can show the welcome message', async () => {
    const { useStore } = await import('@/store/useStore');
    expect(useStore.getState().hasSearched).toBe(false);
  });

  it('stays false for an empty query and never calls the AI search', async () => {
    const { useStore } = await import('@/store/useStore');
    await useStore.getState().performSearch('   ');
    expect(useStore.getState().hasSearched).toBe(false);
    expect(mocks.invoke).not.toHaveBeenCalled();
  });

  it('becomes true once the student actually searches', async () => {
    const { useStore } = await import('@/store/useStore');
    await useStore.getState().performSearch('perros');
    expect(useStore.getState().hasSearched).toBe(true);
    expect(mocks.invoke).toHaveBeenCalledWith('search-content', expect.anything());
  });

  it('goes back to false when the student clears the search box', async () => {
    const { useStore } = await import('@/store/useStore');
    await useStore.getState().performSearch('perros');
    expect(useStore.getState().hasSearched).toBe(true);
    await useStore.getState().performSearch('');
    expect(useStore.getState().hasSearched).toBe(false);
    expect(useStore.getState().searchResults).toEqual([]);
  });
  it('does not offer demo lessons when educational verification fails', async () => {
    mocks.invoke.mockResolvedValue({ error: new Error('Edge Function returned a non-2xx status code'), data: null });
    const { useStore } = await import('@/store/useStore');
    await useStore.getState().performSearch('chismes de famosos');
    expect(useStore.getState().searchResults).toEqual([]);
    expect(useStore.getState().searchLoading).toBe(false);
    expect(mocks.invoke).toHaveBeenCalledTimes(1);
  });
});
