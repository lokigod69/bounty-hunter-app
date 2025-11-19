# Domain Layer

This directory contains domain functions that encapsulate business logic and Supabase operations. UI components should call these functions instead of directly using Supabase.

## Structure

- **missions.ts** - Mission/task operations (approve, reject, status updates, proof uploads)
- **rewards.ts** - Reward store operations (purchase, create, update, delete)
- **credits.ts** - Credit operations (grant credits, get balance)
- **streaks.ts** - Daily mission streak operations

## Design Principles

1. **Separation of Concerns**: Domain functions handle all Supabase calls and business logic. UI components only handle presentation and user interaction.

2. **Use Existing Core Logic**: Domain functions use pure business logic from `src/core/` (e.g., `evaluateStatusChange`, `decideCreditsForApprovedContract`).

3. **Error Handling**: Domain functions throw errors that UI components can catch and display to users.

4. **No React Dependencies**: Domain functions are pure TypeScript/async functions, making them testable and reusable.

## Current Supabase Usage Inventory

### Before Refactor (Direct Supabase Calls in UI):

- **IssuedPage.tsx**: 
  - Approve missions (fetch task, update status, increment credits, update streaks)
  - Reject missions (fetch task, update status, clear proof)
  - Archive missions (update status)

- **Dashboard.tsx**:
  - Status updates (fetch task, evaluate status change, update status)
  - Proof uploads (upload file, update task proof_url)

- **RewardsStorePage.tsx** (via hooks):
  - Purchase rewards (RPC: purchase_reward_store_item)
  - Create rewards (RPC: create_reward_store_item)
  - Update rewards (RPC: update_reward_store_item)
  - Delete rewards (RPC: delete_reward_store_item)

- **Hooks**:
  - `usePurchaseBounty.ts`: Direct RPC call to purchase_bounty
  - `useRewardsStore.ts`: Direct RPC calls for reward operations
  - `useDailyMissionStreak.ts`: Direct Supabase calls for streak operations

### After Refactor:

UI components call domain functions:
- `missions.approveMission({ missionId, issuerId })`
- `missions.rejectMission({ missionId, issuerId })`
- `missions.updateStatus({ missionId, status, userId })`
- `missions.uploadProof({ missionId, file, userId })`
- `rewards.purchaseReward({ rewardId, userId })`
- `rewards.createReward({ data, userId })`
- `credits.grantCredits({ userId, amount })`
- `streaks.updateStreakAfterCompletion({ missionId, userId })`

