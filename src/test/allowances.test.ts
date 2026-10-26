import { describe, expect, it, vi } from 'vitest';
import { FREE_ALLOWANCES, remainingAllowance } from '@/lib/allowances';

describe('Free account allowances', () => {
  it('allows exactly three ATS reviews daily', () => {
    expect(FREE_ALLOWANCES.ats).toMatchObject({ limit: 3, period: 'daily' });
    expect(remainingAllowance('ats', 2)).toBe(1);
    expect(remainingAllowance('ats', 3)).toBe(0);
  });
  it('allows exactly three copilot chats daily', () => {
    expect(FREE_ALLOWANCES.chat).toMatchObject({ limit: 3, period: 'daily' });
    expect(remainingAllowance('chat', 3)).toBe(0);
  });
  it('allows one lifetime free resume upload', () => {
    expect(FREE_ALLOWANCES.upload).toMatchObject({ limit: 1, period: 'total' });
    expect(remainingAllowance('upload', 1)).toBe(0);
  });
  it('allows five lifetime company discoveries', () => {
    expect(FREE_ALLOWANCES.company).toMatchObject({ limit: 5, period: 'total' });
    expect(remainingAllowance('company', 4)).toBe(1);
    expect(remainingAllowance('company', 5)).toBe(0);
  });
  it('maps unlimited use to the provider powering each feature', () => {
    expect(FREE_ALLOWANCES.chat.provider).toBe('nebius');
    expect(FREE_ALLOWANCES.ats.provider).toBe('nebius');
    expect(FREE_ALLOWANCES.upload.provider).toBe('nebius');
    expect(FREE_ALLOWANCES.company.provider).toBe('tavily');
  });
});

vi.mock('@/lib/allowances.functions', () => ({ getAdminFineTuneDataset: vi.fn() }));
it('does not export when the server denies the admin role', async () => {
  const { getAdminFineTuneDataset } = await import('@/lib/allowances.functions');
  vi.mocked(getAdminFineTuneDataset).mockRejectedValue(new Error('Admins only'));
  const { exportFineTuneDataset } = await import('@/lib/finetune-export');
  await expect(exportFineTuneDataset()).rejects.toThrow('Admins only');
});