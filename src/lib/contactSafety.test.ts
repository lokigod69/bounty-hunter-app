import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const { rpc, from } = vi.hoisted(() => ({ rpc: vi.fn(), from: vi.fn() }));
vi.mock('./supabase', () => ({ supabase: { rpc, from } }));
import { lookupContacts, listBlockedPeople, reportPerson, setPersonBlock } from './contactSafety';

describe('staged contact safety client', () => {
  beforeEach(() => { vi.clearAllMocks(); vi.stubEnv('VITE_CONTACT_SAFETY_ENABLED', 'true'); });
  afterEach(() => vi.unstubAllEnvs());
  it('makes no request while the backend gate is off', async () => {
    vi.stubEnv('VITE_CONTACT_SAFETY_ENABLED', 'false');
    await expect(lookupContacts('Alex')).rejects.toThrow();
    await expect(listBlockedPeople()).rejects.toThrow();
    await expect(setPersonBlock('person', true)).rejects.toThrow();
    await expect(reportPerson('person', 'spam', '')).rejects.toThrow();
    expect(rpc).not.toHaveBeenCalled(); expect(from).not.toHaveBeenCalled();
  });
  it('never falls back to a public directory when lookup is absent', async () => {
    rpc.mockResolvedValue({ data: null, error: { code: 'PGRST202' } });
    await expect(lookupContacts('Alex')).rejects.toThrow();
    expect(from).not.toHaveBeenCalled();
  });
  it.each([{ data: false, error: null }, { data: null, error: null }, { data: true, error: { message: 'denied' } }])('requires explicit block success: %j', async result => {
    rpc.mockResolvedValue(result);
    await expect(setPersonBlock('person', true)).rejects.toThrow();
  });
  it('requires a report receipt and sends no spoofable reporter ID', async () => {
    rpc.mockResolvedValueOnce({ data: null, error: null });
    await expect(reportPerson('person', 'spam', ' note ')).rejects.toThrow();
    rpc.mockResolvedValueOnce({ data: '11111111-1111-4111-8111-111111111111', error: null });
    await expect(reportPerson('person', 'spam', ' note ')).resolves.toBe('11111111-1111-4111-8111-111111111111');
    expect(rpc).toHaveBeenLastCalledWith('report_person', { p_person: 'person', p_reason: 'spam', p_details: 'note' });
  });
});
