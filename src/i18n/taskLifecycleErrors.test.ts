// src/i18n/taskLifecycleErrors.test.ts
// Pins the code -> copy contract that moved out of src/domain/missions.ts.
//
// Two things can silently break here: a code the server can return that no
// longer maps to a key (the user gets a generic "failed" instead of the reason
// we wrote), and a key that exists in the map but not in the locale files (the
// user gets the raw key path on screen). Both are checked against the real
// English bundle rather than a stub.

import { describe, expect, it } from 'vitest';
import en from './locales/en/translation.json';
import {
  taskLifecycleErrorKey,
  translateTaskLifecycleError,
  translateTaskLifecycleErrorObject,
  type Translator,
} from './taskLifecycleErrors';
import { TaskLifecycleRpcError, type TaskLifecycleOperation } from '../domain/missions';

/** Reads a dotted key out of a locale bundle the way i18next would. */
function lookup(bundle: unknown, key: string): string | undefined {
  const value = key.split('.').reduce<unknown>((acc, seg) => {
    if (acc && typeof acc === 'object') return (acc as Record<string, unknown>)[seg];
    return undefined;
  }, bundle);
  return typeof value === 'string' ? value : undefined;
}

/** A real translator over the English bundle, with {{var}} interpolation. */
const t: Translator = (key, options) => {
  const raw = lookup(en, key);
  if (raw === undefined) return key;
  if (!options) return raw;
  return raw.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (whole, name: string) =>
    name in options ? String(options[name]) : whole
  );
};

const OPERATIONS: TaskLifecycleOperation[] = [
  'archive', 'create', 'delete', 'reject', 'status', 'submit', 'update',
];

// Every code the RPC layer can hand us (types/custom.ts TaskLifecycleRpcErrorCode).
const CODES = [
  'not_authenticated', 'task_not_found', 'not_assignee', 'not_creator',
  'not_participant', 'wrong_status', 'proof_required', 'invalid_proof_type',
  'status_not_allowed', 'title_required', 'invalid_field',
  'self_assigned_credit_reward',
] as const;

describe('task lifecycle error copy', () => {
  it.each(CODES)('maps %s to a key that exists in English', (code) => {
    const key = taskLifecycleErrorKey(code, 'submit');
    expect(key, `no key mapped for ${code}`).not.toBeNull();
    expect(lookup(en, key!), `${key} missing from en/translation.json`).toBeTypeOf('string');
  });

  it.each([
    ['not_authenticated', 'submit', 'You must be logged in to submit this task.'],
    ['not_authenticated', 'archive', 'You must be logged in to archive this task.'],
    ['task_not_found', 'submit', 'Task not found or has been deleted.'],
    ['not_assignee', 'submit', 'You are not assigned to this task.'],
    ['not_creator', 'reject', 'Only the task creator can reject this task.'],
    ['not_creator', 'update', 'You can only edit tasks that you created.'],
    ['not_creator', 'delete', 'You can only delete tasks that you created.'],
    ['not_participant', 'archive', 'Only the creator or assignee can archive this task.'],
    ['wrong_status', 'submit', 'This task is not in the correct status for that action.'],
    ['proof_required', 'submit', 'This task requires proof. Please upload proof to complete.'],
    ['invalid_proof_type', 'submit', 'Invalid proof type. Use an image, video, PDF, or text proof.'],
    ['status_not_allowed', 'status', 'This status change is not allowed.'],
    ['title_required', 'create', 'Task title is required.'],
    ['invalid_field', 'update', 'Task update contains fields that cannot be changed.'],
  ] as const)('renders %s/%s in English exactly as before the extraction', (code, operation, expected) => {
    expect(translateTaskLifecycleError(code, operation, t)).toBe(expected);
  });

  it('states the 013 rule from the same key the inline validation uses', () => {
    expect(taskLifecycleErrorKey('self_assigned_credit_reward', 'create'))
      .toBe('taskForm.validation.selfAssignedCredit');
    expect(translateTaskLifecycleError('self_assigned_credit_reward', 'create', t)).toBe(
      "You can't pay yourself credits — standing is earned from someone else's " +
      "judgement. Assign this to someone, or pick a custom reward."
    );
  });

  it.each(OPERATIONS)('falls back to the generic %s message for an unknown code', (operation) => {
    expect(taskLifecycleErrorKey('brand_new_server_refusal', operation)).toBeNull();
    const message = translateTaskLifecycleError('brand_new_server_refusal', operation, t);
    expect(message).toBe(lookup(en, `taskErrors.fallback.${operation}`));
    // Never leak the machine code to a human.
    expect(message).not.toContain('brand_new_server_refusal');
  });

  it('never leaves a {{placeholder}} unresolved', () => {
    for (const operation of OPERATIONS) {
      for (const code of [...CODES, undefined]) {
        expect(translateTaskLifecycleError(code, operation, t)).not.toMatch(/\{\{/);
      }
    }
  });

  it('localizes a thrown lifecycle error and ignores anything else', () => {
    const error = new TaskLifecycleRpcError('not_assignee', 'submit');
    expect(translateTaskLifecycleErrorObject(error, t)).toBe('You are not assigned to this task.');
    expect(translateTaskLifecycleErrorObject(new Error('not_assignee'), t)).toBeNull();
    expect(translateTaskLifecycleErrorObject(undefined, t)).toBeNull();
    expect(translateTaskLifecycleErrorObject('not_assignee', t)).toBeNull();
  });
});
