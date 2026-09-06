// Offline UI fixtures, deliberately not a backend emulator or production module.
// All fetches terminate here; no requests or credentials reach Supabase.
import { createClient } from '@supabase/supabase-js';

const scenario = new URLSearchParams(window.location.search).get('scenario');
const empty = scenario === 'empty' || scenario === 'new' || scenario === 'invite-retry';
const me = '00000000-0000-4000-8000-000000000001';
const alex = '00000000-0000-4000-8000-000000000002';
const sam = '00000000-0000-4000-8000-000000000003';
const now = new Date().toISOString();
const profile = (id, name) => ({ id, display_name: name, email: name.toLowerCase() + '@example.test', avatar_url: null, created_at: now, updated_at: now, role: null, theme: 'guild', language: 'en', onboarding_completed: scenario !== 'new', partner_user_id: id === me ? alex : null });
const profiles = [profile(me, 'Michael'), profile(alex, 'Alex'), profile(sam, 'Sam')];
const user = { id: me, email: 'michael@example.test', aud: 'authenticated', role: 'authenticated', user_metadata: {}, app_metadata: {}, created_at: now };
const token = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' })) + '.' + btoa(JSON.stringify({ sub: me, exp: Math.floor(Date.now() / 1000) + 86400, aud: 'authenticated' })) + '.preview';
const session = { access_token: token, refresh_token: 'offline-preview', expires_at: Math.floor(Date.now() / 1000) + 86400, expires_in: 86400, token_type: 'bearer', user };
const task = (id, title, creator, recipient, status, extra = {}) => ({
  id, title, created_by: creator, assigned_to: recipient, status, description: null, deadline: null,
  reward_type: 'credit', reward_text: scenario === 'skin-stress' ? '12500' : '5', proof_required: false, proof_type: null, proof_url: null, proof_description: null,
  rejection_reason: null, is_archived: false, is_daily: false, created_at: now, updated_at: now,
  completed_at: status === 'completed' ? now : null, ...extra,
});
const tables = {
  profiles,
  tasks: empty ? [] : [
    task('10000000-0000-4000-8000-000000000001', 'Walk Luna this evening', alex, me, 'pending', { reward_type: 'text', reward_text: 'Breakfast in bed' }),
    task('10000000-0000-4000-8000-000000000002', 'Water the balcony plants', sam, me, 'in_progress'),
    task('10000000-0000-4000-8000-000000000003', 'Pick up groceries', alex, me, 'review', { proof_type: 'text', proof_description: 'Everything is in the kitchen.' }),
    task('10000000-0000-4000-8000-000000000004', 'Plan our Saturday walk', me, alex, 'review', { proof_required: true, proof_type: 'text', proof_description: 'Riverside trail, 9 am. I checked the weather.' }),
    task('10000000-0000-4000-8000-000000000005', 'Take the recycling out', me, sam, 'pending'),
    task('10000000-0000-4000-8000-000000000006', 'Feed Luna', me, sam, 'completed'),
  ],
  friendships: empty ? [] : [alex, sam].map((id, i) => ({ id: 'friendship-' + i, user1_id: me, user2_id: id, requested_by: me, status: 'accepted', created_at: now })),
  user_credits: [{ user_id: me, balance: empty ? 0 : 24, total_earned: empty ? 0 : 34 }, { user_id: alex, balance: 10, total_earned: 10 }, { user_id: sam, balance: 5, total_earned: 5 }],
  rewards_store: empty ? [] : [{ id: 'reward-one', name: 'A slow Sunday breakfast', description: 'Coffee, pancakes, and no rush. Pick a Sunday together.', creator_id: alex, assigned_to: me, credit_cost: 20, is_active: true, image_url: null, emoji: '🥞', created_at: now, updated_at: now, is_redeemed: false }],
  collected_rewards: [], daily_mission_streaks: [],
};
const json = (data, status = 200, headers = {}) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', ...headers } });
const split = value => { let depth = 0, from = 0; const parts = []; [...value].forEach((c, i) => { if (c === '(') depth++; if (c === ')') depth--; if (c === ',' && depth === 0) { parts.push(value.slice(from, i)); from = i + 1; } }); parts.push(value.slice(from)); return parts; };
function matches(row, condition) {
  const group = /^(and|or)\((.*)\)$/.exec(condition);
  if (group) return split(group[2])[group[1] === 'and' ? 'every' : 'some'](item => matches(row, item));
  const [, field, operation, value] = /^([^.]+)\.([^.]+)\.(.*)$/.exec(condition) || [];
  if (operation === 'eq') return String(row[field]) === value;
  if (operation === 'neq') return String(row[field]) !== value;
  if (operation === 'is') return value === 'null' ? row[field] == null : String(row[field]) === value;
  if (operation === 'in') return value.slice(1, -1).split(',').includes(String(row[field]));
  if (operation === 'ilike') return String(row[field]).toLowerCase().includes(value.replace(/%/g, '').toLowerCase());
  return true;
}
let inviteAttempts = 0;
const listeners = new Set();
const changed = () => queueMicrotask(() => listeners.forEach(callback => callback({ eventType: 'UPDATE' })));
async function rpc(name, args) {
  if (name === 'get_or_create_invite') return json({ success: true, token: 'sample-invite' });
  if (name === 'redeem_invite') {
    if (scenario === 'invite-retry' && inviteAttempts++ === 0) return json({ message: 'Preview: connection interrupted. Try again.' }, 503);
    if (!tables.friendships.length) tables.friendships.push({ id: 'invited', user1_id: me, user2_id: alex, requested_by: alex, status: 'accepted', created_at: now });
    return json({ success: true, inviter_id: alex, inviter_name: 'Alex' });
  }
  if (name === 'create_task') {
    const id = crypto.randomUUID();
    tables.tasks.push(task(id, args.p_title, me, args.p_assigned_to, 'pending', Object.fromEntries(Object.entries(args).map(([key, value]) => [key.replace(/^p_/, ''), value]))));
    changed(); return json({ success: true, task_id: id });
  }
  const mission = tables.tasks.find(item => item.id === args.p_task_id);
  if (mission) {
    if (name === 'set_task_status') mission.status = args.p_status;
    else if (name === 'submit_proof') Object.assign(mission, { status: 'review', proof_description: args.p_proof_description || null, proof_type: args.p_proof_type || null, proof_url: args.p_proof_url || null });
    else if (name === 'update_task') Object.assign(mission, args.p_patch);
    else if (name === 'approve_task') {
      mission.status = 'completed'; mission.completed_at = new Date().toISOString();
      const credits = tables.user_credits.find(row => row.user_id === mission.assigned_to);
      if (credits && mission.reward_type === 'credit') { credits.balance += Number(mission.reward_text); credits.total_earned += Number(mission.reward_text); }
    } else if (name === 'reject_task') { mission.status = 'rejected'; mission.rejection_reason = args.p_rejection_reason || null; }
    else if (name === 'archive_task') mission.is_archived = true;
    else if (name === 'delete_task') tables.tasks = tables.tasks.filter(item => item !== mission);
    else return json({ message: 'Unsupported preview operation: ' + name }, 400);
    changed(); return json({ success: true });
  }
  return json({ message: 'Unsupported preview operation: ' + name }, 400);
}
async function previewFetch(input, init = {}) {
  const url = new URL(typeof input === 'string' ? input : input.url);
  if (url.pathname.startsWith('/auth/v1/')) return json(url.pathname.endsWith('/user') ? user : session);
  if (url.pathname.startsWith('/rest/v1/rpc/')) return rpc(url.pathname.split('/').pop(), JSON.parse(init.body || '{}'));
  const name = url.pathname.split('/').pop();
  if (!(name in tables)) return json({ message: 'Unsupported preview endpoint: ' + url.pathname }, 400);
  let rows = tables[name].filter(row => [...url.searchParams].every(([field, filter]) => ['select', 'order', 'limit', 'offset'].includes(field) || matches(row, field === 'or' ? 'or' + filter : field + '.' + filter)));
  const method = init.method || 'GET';
  if (method === 'PATCH') { rows.forEach(row => Object.assign(row, JSON.parse(init.body))); changed(); }
  if (method === 'POST') { const data = JSON.parse(init.body); rows = (Array.isArray(data) ? data : [data]).map(row => ({ id: crypto.randomUUID(), created_at: now, ...row })); tables[name].push(...rows); changed(); }
  if (method === 'DELETE') { tables[name] = tables[name].filter(row => !rows.includes(row)); changed(); return new Response(null, { status: 204 }); }
  const count = rows.length;
  const limit = url.searchParams.get('limit'); if (limit) rows = rows.slice(0, Number(limit));
  rows = rows.map(row => name === 'tasks' ? { ...row, creator: profiles.find(p => p.id === row.created_by), assignee: profiles.find(p => p.id === row.assigned_to) } : name === 'rewards_store' ? { ...row, assignee_profile: profiles.find(p => p.id === row.assigned_to) } : row);
  const headers = new Headers(init.headers);
  if (method === 'HEAD') return new Response(null, { status: 200, headers: { 'Content-Range': `0-${Math.max(0, count - 1)}/${count}` } });
  return json(headers.get('Accept')?.includes('vnd.pgrst.object') ? (rows[0] || null) : rows);
}
const storage = new Map(scenario === 'signed-out' ? [] : [['bh-ux-preview', JSON.stringify(session)]]);
export const supabase = createClient('http://127.0.0.1:6076', 'offline-preview-public-key', {
  global: { fetch: previewFetch },
  auth: { storageKey: 'bh-ux-preview', storage: { getItem: key => storage.get(key) || null, setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) }, autoRefreshToken: false, detectSessionInUrl: false },
});
supabase.channel = () => {
  const callbacks = [];
  return { on(_type, _filter, callback) { callbacks.push(callback); return this; }, subscribe() { callbacks.forEach(fn => listeners.add(fn)); return this; }, unsubscribe() { callbacks.forEach(fn => listeners.delete(fn)); return Promise.resolve('ok'); } };
};
supabase.removeChannel = channel => channel.unsubscribe();
