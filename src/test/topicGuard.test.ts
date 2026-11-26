import { describe, expect, it, vi } from 'vitest';
import { educationalApproval, TopicValidationUnavailable } from '../../supabase/functions/_shared/topic-policy';
const response = (verdict: unknown) => ({ choices: [{ message: { tool_calls: [{ function: { arguments: JSON.stringify(verdict) } }] } }] });

describe('educational approval before generation', () => {
  it('rejects celebrity gossip before creating a lesson', async () => {
    expect((await educationalApproval(async () => null, async () => response({ educational: false, reason: 'No es educativo', suggestions: [] }))).educational).toBe(false);
  });
  it('stops when verification is unavailable instead of approving generation', async () => {
    const classify = vi.fn().mockRejectedValue(new Error('Unavailable'));
    await expect(educationalApproval(async () => null, classify)).rejects.toBeInstanceOf(TopicValidationUnavailable);
    expect(classify).toHaveBeenCalledTimes(1);
  });
  it.each([{}, { educational: 'true' }, { educational: true, reason: '', suggestions: [4] }])('never interprets a malformed verdict as approval: %j', async verdict => {
    await expect(educationalApproval(async () => null, async () => response(verdict))).rejects.toBeInstanceOf(TopicValidationUnavailable);
  });
  it('reuses cached educational approval without another AI call', async () => {
    const classify = vi.fn();
    expect((await educationalApproval(async () => response({ educational: true, reason: '', suggestions: [] }), classify)).educational).toBe(true);
    expect(classify).not.toHaveBeenCalled();
  });
});