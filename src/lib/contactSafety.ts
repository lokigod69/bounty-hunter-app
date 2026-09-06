import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';
import type { PersonSummary } from '../types/custom';
import { supabase } from './supabase';

// Staged 019 overlay. Keep the generated live database contract untouched.
type SafetyDatabase = Database & { public: { Functions: {
  lookup_contacts: { Args: { p_query: string }; Returns: PersonSummary[] };
  list_blocked_people: { Args: Record<string, never>; Returns: PersonSummary[] };
  set_person_block: { Args: { p_person: string; p_blocked: boolean }; Returns: boolean };
  report_person: { Args: { p_person: string; p_reason: string; p_details: string }; Returns: string };
} } };
const client = supabase as unknown as SupabaseClient<SafetyDatabase>;
export const contactSafetyEnabled = () => import.meta.env.VITE_CONTACT_SAFETY_ENABLED === 'true';
export type ReportReason = 'harassment' | 'unsafe_content' | 'spam' | 'other';
function requireEnabled() { if (!contactSafetyEnabled()) throw new Error('safety_unavailable'); }
export async function lookupContacts(query: string): Promise<PersonSummary[]> {
  requireEnabled();
  const { data, error } = await client.rpc('lookup_contacts', { p_query: query.trim() });
  if (error || !Array.isArray(data)) throw new Error('safety_unavailable');
  return data;
}
export async function listBlockedPeople(): Promise<PersonSummary[]> {
  requireEnabled();
  const { data, error } = await client.rpc('list_blocked_people', {});
  if (error || !Array.isArray(data)) throw new Error('safety_unavailable');
  return data;
}
export async function setPersonBlock(person: string, blocked: boolean): Promise<void> {
  requireEnabled();
  const { data, error } = await client.rpc('set_person_block', { p_person: person, p_blocked: blocked });
  if (error || data !== true) throw new Error('safety_unavailable');
}
export async function reportPerson(person: string, reason: ReportReason, details: string): Promise<string> {
  requireEnabled();
  const { data, error } = await client.rpc('report_person', { p_person: person, p_reason: reason, p_details: details.trim() });
  if (error || typeof data !== 'string' || !/^[0-9a-f-]{36}$/i.test(data)) throw new Error('safety_unavailable');
  return data;
}
