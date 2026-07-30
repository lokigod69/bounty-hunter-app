import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';
import {
  approveMission,
  archiveMission,
  createTaskViaRpc,
  getTaskLifecycleRpcErrorMessage,
  isSelfAssignedCreditError,
  rejectMission,
  requireTaskLifecycleRpcSuccess,
  submitForReviewNoProof,
  TaskLifecycleRpcError,
  updateTaskViaRpc,
  updateMissionStatus,
  uploadProof,
} from './missions';

type LifecycleClient = SupabaseClient<Database>;
type MutationClient = SupabaseClient<Database>;

function makeClient(task: Record<string, unknown> | null = null) {
  const query = {
    eq: vi.fn(),
    select: vi.fn(),
    single: vi.fn(),
  };
  query.eq.mockReturnValue(query);
  query.select.mockReturnValue(query);
  query.single.mockResolvedValue({ data: task, error: null });

  const rpc = vi.fn().mockResolvedValue({ data: { success: true }, error: null });
  const client = {
    from: vi.fn().mockReturnValue(query),
    rpc,
  } as unknown as LifecycleClient;

  return { client, rpc };
}

function makeMutationClient(result: Record<string, unknown>) {
  const rpc = vi.fn().mockResolvedValue({ data: result, error: null });
  return {
    client: { rpc } as unknown as MutationClient,
    rpc,
  };
}

describe('task lifecycle RPC result handling', () => {
  it.each([
    ['not_authenticated', 'You must be logged in to submit this task.'],
    ['task_not_found', 'Task not found or has been deleted.'],
    ['not_assignee', 'You are not assigned to this task.'],
    ['not_creator', 'Only the task creator can reject this task.'],
    ['not_participant', 'Only the creator or assignee can archive this task.'],
    ['wrong_status', 'This task is not in the correct status for that action.'],
    ['proof_required', 'This task requires proof. Please upload proof to complete.'],
    ['invalid_proof_type', 'Invalid proof type. Use an image, video, PDF, or text proof.'],
    ['status_not_allowed', 'This status change is not allowed.'],
  ])('maps %s to a user-facing message', (code, expected) => {
    const operation = code === 'not_creator' ? 'reject' : code === 'not_participant' ? 'archive' : 'submit';
    expect(getTaskLifecycleRpcErrorMessage(code, operation)).toBe(expected);
  });

  it.each([
    { success: true, already_submitted: true },
    { success: true, already_rejected: true },
    { success: true, already_archived: true },
    { success: true, already_deleted: true },
    { success: true, unchanged: true },
  ])('accepts idempotent success envelopes', result => {
    expect(requireTaskLifecycleRpcSuccess(result, 'submit')).toBe(result);
  });

  it('throws mapped logical RPC errors', () => {
    expect(() => requireTaskLifecycleRpcSuccess(
      { success: false, error: 'proof_required' },
      'submit',
    )).toThrow('This task requires proof. Please upload proof to complete.');
  });
});

// Proposal 013 — the self-assign standing hole.
describe('013: self-assigned credit rewards', () => {
  it('maps the create/update refusal to a sentence that says why', () => {
    expect(getTaskLifecycleRpcErrorMessage('self_assigned_credit_reward', 'create'))
      .toBe(
        "You can't pay yourself credits — standing is earned from someone else's " +
        "judgement. Assign this to someone, or pick a custom reward.",
      );
  });

  it('carries the error code so the UI can localize it', () => {
    let thrown: unknown;
    try {
      requireTaskLifecycleRpcSuccess(
        { success: false, error: 'self_assigned_credit_reward' },
        'create',
      );
    } catch (e) {
      thrown = e;
    }

    expect(thrown).toBeInstanceOf(TaskLifecycleRpcError);
    expect((thrown as TaskLifecycleRpcError).code).toBe('self_assigned_credit_reward');
    expect((thrown as TaskLifecycleRpcError).operation).toBe('create');
    expect(isSelfAssignedCreditError(thrown)).toBe(true);
  });

  it('does not mistake other lifecycle failures for the 013 rule', () => {
    const other = new TaskLifecycleRpcError('title_required', 'create');
    expect(isSelfAssignedCreditError(other)).toBe(false);
    expect(isSelfAssignedCreditError(new Error('self_assigned_credit_reward'))).toBe(false);
    expect(isSelfAssignedCreditError(undefined)).toBe(false);
  });

  it('reports a skipped payout when approve_task declines to credit', async () => {
    const { client } = makeClient();
    (client.rpc as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { success: true, credited: false, credit_skipped_reason: 'self_assigned' },
      error: null,
    });

    await expect(approveMission({ missionId: 't1', issuerId: 'u1', supabaseClient: client }))
      .resolves.toEqual({ credited: false, creditSkippedReason: 'self_assigned' });
  });

  it('reports a real payout as credited', async () => {
    const { client } = makeClient();
    (client.rpc as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { success: true, credited: true, credit_skipped_reason: null },
      error: null,
    });

    await expect(approveMission({ missionId: 't1', issuerId: 'u1', supabaseClient: client }))
      .resolves.toEqual({ credited: true, creditSkippedReason: null });
  });

  it('treats a pre-013 server (no credited key) as having paid', async () => {
    // The old approve_task always paid. Reading a missing key as "skipped"
    // would tell every user their credits vanished until the SQL is applied.
    const { client } = makeClient();
    (client.rpc as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { success: true, message: 'Task approved successfully' },
      error: null,
    });

    await expect(approveMission({ missionId: 't1', issuerId: 'u1', supabaseClient: client }))
      .resolves.toEqual({ credited: true, creditSkippedReason: null });
  });
});

describe('mission lifecycle RPC routing', () => {
  it('routes rejection to reject_task with the trimmed reason', async () => {
    const { client, rpc } = makeClient({
      assigned_to: 'assignee',
      created_by: 'creator',
      status: 'review',
    });

    await rejectMission({
      missionId: 'task-1',
      issuerId: 'creator',
      reason: '  Needs a clearer photo.  ',
      supabaseClient: client,
    });

    expect(rpc).toHaveBeenCalledWith('reject_task', {
      p_task_id: 'task-1',
      p_rejection_reason: 'Needs a clearer photo.',
    });
  });

  it('routes pending/in-progress changes to set_task_status', async () => {
    const { client, rpc } = makeClient({
      assigned_to: 'assignee',
      created_by: 'creator',
      proof_required: true,
      proof_url: null,
      reward_text: '5',
      reward_type: 'credit',
      status: 'pending',
    });

    await updateMissionStatus({
      missionId: 'task-2',
      status: 'in_progress',
      userId: 'assignee',
      supabaseClient: client,
    });

    expect(rpc).toHaveBeenCalledWith('set_task_status', {
      p_task_id: 'task-2',
      p_status: 'in_progress',
    });
  });

  it('routes text proof submission to submit_proof', async () => {
    const { client, rpc } = makeClient();

    await uploadProof({
      missionId: 'task-3',
      textDescription: 'Finished and verified.',
      userId: 'assignee',
      supabaseClient: client,
    });

    expect(rpc).toHaveBeenCalledWith('submit_proof', {
      p_task_id: 'task-3',
      p_proof_url: undefined,
      p_proof_type: 'text',
      p_proof_description: 'Finished and verified.',
    });
  });

  it('routes no-proof review submission to submit_proof with only the task id', async () => {
    const { client, rpc } = makeClient({
      assigned_to: 'assignee',
      proof_required: false,
      status: 'pending',
    });

    await submitForReviewNoProof({
      missionId: 'task-4',
      userId: 'assignee',
      supabaseClient: client,
    });

    expect(rpc).toHaveBeenCalledWith('submit_proof', { p_task_id: 'task-4' });
  });

  it('routes archive to archive_task', async () => {
    const { client, rpc } = makeClient({
      assigned_to: 'assignee',
      created_by: 'creator',
    });

    await archiveMission({
      missionId: 'task-5',
      userId: 'creator',
      supabaseClient: client,
    });

    expect(rpc).toHaveBeenCalledWith('archive_task', { p_task_id: 'task-5' });
  });
});

describe('task create/update RPC routing', () => {
  it('extracts task_id from a successful create_task envelope', async () => {
    const { client, rpc } = makeMutationClient({ success: true, task_id: 'task-created' });
    const args = {
      p_title: 'New mission',
      p_description: 'Bring the package home.',
      p_assigned_to: 'assignee',
      p_deadline: '2026-07-20',
      p_reward_type: 'credit',
      p_reward_text: '25',
      p_proof_required: true,
      p_is_daily: false,
    };

    await expect(createTaskViaRpc(args, client)).resolves.toBe('task-created');
    expect(rpc).toHaveBeenCalledWith('create_task', args);
  });

  it('maps create_task logical errors through the shared envelope parser', async () => {
    const { client } = makeMutationClient({ success: false, error: 'title_required' });

    await expect(createTaskViaRpc({ p_title: '' }, client))
      .rejects.toThrow('Task title is required.');
  });

  it('passes the exact update_task patch through unchanged', async () => {
    const { client, rpc } = makeMutationClient({ success: true });
    const patch = {
      title: 'Updated title',
      description: null,
      assigned_to: 'new-assignee',
      deadline: '2026-07-31',
      reward_type: 'gift',
      reward_text: 'Coffee',
      proof_required: false,
      is_daily: true,
    };

    await updateTaskViaRpc('task-update', patch, client);

    expect(rpc).toHaveBeenCalledWith('update_task', {
      p_task_id: 'task-update',
      p_patch: patch,
    });
  });

  it.each([
    ['invalid_field', 'Task update contains fields that cannot be changed.'],
    ['not_creator', 'You can only edit tasks that you created.'],
  ])('maps update_task %s errors', async (error, expected) => {
    const { client } = makeMutationClient({ success: false, error });

    await expect(updateTaskViaRpc('task-update', { title: 'Nope' }, client))
      .rejects.toThrow(expected);
  });
});
