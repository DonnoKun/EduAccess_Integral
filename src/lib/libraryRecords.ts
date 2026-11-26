import type { SearchResult } from '@/types';

export function libraryContent(content: SearchResult, existing?: SearchResult, opened = false): SearchResult {
  return { ...existing, ...content, pinned: opened ? (existing ? existing.pinned !== false : false) : true,
    ...(opened ? { lastOpenedAt: new Date().toISOString() } : {}) };
}
export function splitLibrary(items: { content_data: SearchResult; status: string; updated_at?: string }[]) {
  const recent = items.map(i => ({ ...i.content_data, lastOpenedAt: i.content_data.lastOpenedAt || i.updated_at })).filter(i => i.lastOpenedAt)
    .sort((a, b) => (b.lastOpenedAt || '').localeCompare(a.lastOpenedAt || ''));
  return {
    recentContent: recent,
    savedContent: items.filter(i => i.content_data.pinned !== false).map(i => i.content_data),
    completedContent: items.filter(i => i.status === 'completed').map(i => i.content_data),
  };
}