// src/i18n/taskLifecycleErrors.ts
// The UI-layer half of the task-lifecycle error contract.
//
// The domain (src/domain/missions.ts) reports WHAT the server refused as a
// machine-readable code on TaskLifecycleRpcError. This module is the only place
// that turns such a code into a sentence a person reads, and it does so through
// i18n so all twelve locales get it. Keeping the map here is what lets the
// domain stay translator-free and unit-testable.
//
// `not_creator` is the one code whose meaning depends on what was attempted
// ("you can only DELETE tasks you created" vs "...only EDIT..."), so it resolves
// per operation. Everything else is a straight code -> key lookup.

import i18next from 'i18next';
import { TaskLifecycleRpcError, type TaskLifecycleOperation } from '../domain/missions';
import type { TaskLifecycleRpcErrorCode } from '../types/custom';

/** Minimal shape of i18next's `t`, so callers can pass the hook's translator. */
export type Translator = (key: string, options?: Record<string, unknown>) => string;

const CODE_KEYS: Record<string, string> = {
  task_not_found: 'taskErrors.taskNotFound',
  not_assignee: 'taskErrors.notAssignee',
  not_participant: 'taskErrors.notParticipant',
  wrong_status: 'taskErrors.wrongStatus',
  proof_required: 'taskErrors.proofRequired',
  invalid_proof_type: 'taskErrors.invalidProofType',
  status_not_allowed: 'taskErrors.statusNotAllowed',
  title_required: 'taskErrors.titleRequired',
  invalid_field: 'taskErrors.invalidField',
  // Proposal 013. Shares the key TaskForm's inline validation already uses, so
  // the client-side check and the server refusal cannot drift apart.
  self_assigned_credit_reward: 'taskForm.validation.selfAssignedCredit',
};

/**
 * The i18n key for a lifecycle error code, or null when the code is unknown
 * (a new server-side refusal we do not have copy for yet).
 */
export function taskLifecycleErrorKey(
  code: TaskLifecycleRpcErrorCode | string | undefined,
  operation: TaskLifecycleOperation,
): string | null {
  if (code === 'not_authenticated') return 'taskErrors.notAuthenticated';
  if (code === 'not_creator') {
    if (operation === 'reject') return 'taskErrors.notCreatorReject';
    if (operation === 'update') return 'taskErrors.notCreatorUpdate';
    return 'taskErrors.notCreatorDelete';
  }
  return (code && CODE_KEYS[code]) ?? null;
}

const defaultTranslator: Translator = (key, options) =>
  i18next.t(key, options as never) as unknown as string;

/**
 * Localized sentence for a lifecycle error code. Unknown codes fall back to the
 * generic per-operation message rather than leaking the raw code.
 *
 * `not_authenticated` interpolates the attempted action as a whole phrase
 * ("submit this task"), so languages that put the verb elsewhere in the
 * sentence can order it themselves instead of receiving glued-on fragments.
 */
export function translateTaskLifecycleError(
  code: TaskLifecycleRpcErrorCode | string | undefined,
  operation: TaskLifecycleOperation,
  t: Translator = defaultTranslator,
): string {
  const key = taskLifecycleErrorKey(code, operation);
  if (!key) return t(`taskErrors.fallback.${operation}`);
  if (key === 'taskErrors.notAuthenticated') {
    return t(key, { action: t(`taskErrors.actions.${operation}`) });
  }
  return t(key);
}

/**
 * Localized message for an unknown thrown value, or null when it is not a
 * lifecycle RPC error and the caller should keep its own handling.
 */
export function translateTaskLifecycleErrorObject(
  error: unknown,
  t: Translator = defaultTranslator,
): string | null {
  if (!(error instanceof TaskLifecycleRpcError)) return null;
  return translateTaskLifecycleError(error.code, error.operation, t);
}
