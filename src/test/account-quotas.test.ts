import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ rpc: vi.fn(), getUser: vi.fn() }));
vi.mock('@tanstack/react-start/server', () => ({ getRequestHeader: () => 'Bearer test-token' }));
vi.mock('@/integrations/supabase/client.server', () => ({ supabaseAdmin: { rpc: mocks.rpc, auth: { getUser: mocks.getUser } } }));
import { demoRemaining, useDemoCheck, useCompanyDiscovery, useKindQuota, demoKey } from '@/lib/demo.server';

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getUser.mockResolvedValue({ data: { user: { id: 'test-account' } }, error: null });
});
describe('Authoritative free quotas', () => {
  it('gives each account three chats regardless of another account on the same IP', async () => {
    mocks.rpc.mockResolvedValue({ data: 0, error: null });
    expect(await demoRemaining('test-account')).toBe(3);
    expect(mocks.rpc).toHaveBeenCalledExactlyOnceWith('demo_used', { _bucket: 'v:test-account', _kind: 'check' });
  });
  it('blocks the fourth free chat', async () => {
    mocks.rpc.mockResolvedValue({ data: 3, error: null });
    await expect(useDemoCheck()).rejects.toThrow("You've used your 3 free checks");
    expect(mocks.rpc).not.toHaveBeenCalledWith('demo_consume', expect.anything());
  });
  it('uses an independent three-review ATS allowance', async () => {
    mocks.rpc.mockResolvedValue({ data: -1, error: null });
    await expect(useKindQuota('ats', 'ATS exhausted')).rejects.toThrow('ATS exhausted');
    expect(mocks.rpc).toHaveBeenCalledExactlyOnceWith('demo_consume', { _bucket: 'v:test-account', _kind: 'ats', _limit: 3 });
  });
  it('blocks a sixth lifetime company discovery', async () => {
    mocks.rpc.mockResolvedValue({ data: -1, error: null });
    await expect(useCompanyDiscovery('Jane Street', 'https://www.janestreet.com/careers')).rejects.toThrow('5 free companies');
    expect(mocks.rpc).toHaveBeenCalledWith('consume_feature_allowance', { _user: 'test-account', _kind: 'company', _resource: 'janestreet.com' });
  });
  it('bypasses free metering when using a personal provider key', async () => {
    expect(await demoKey('own-test-key', 'TAVILY_API_KEY', 'search')).toBe('own-test-key');
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
});