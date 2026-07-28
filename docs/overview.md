# Bounty Hunter App - Overview

> **⚠️ HISTORICAL (2025-10).** This document predates proposals 001–012, the RPC-authoritative
> task lifecycle, and Design V2. For current deep context see `docs/codex-refactor-pass/` and
> `memory/STATE.md`. Kept for archaeology only — do not plan work from it.

## Product Summary

**Bounty Hunter App** is a gamified task management system where users create contracts (tasks) for their friends/guild members, award credits upon completion, and enable users to redeem credits for rewards. Think of it as a social productivity app with RPG-style bounty mechanics.

### Core Concept
- **Contracts/Tasks**: Users assign tasks to friends with credit rewards
- **Proof System**: Optionally require photo/video evidence of completion
- **Credit Economy**: Complete tasks → earn credits → spend in rewards store
- **Guild System**: Friend network using send/accept invitations
- **Rewards Store**: Users create bounties claimable by others using credits

---

## User Roles & Personas

### 1. **Contract Issuer** (Task Creator)
- Creates tasks and assigns to friends
- Sets reward amounts (credits)
- Reviews proof submissions
- Approves/declines completions
- Awards credits upon approval

### 2. **Bounty Hunter** (Task Assignee)
- Views assigned contracts
- Submits proof of completion (if required)
- Earns credits when approved
- Spends credits in rewards store

### 3. **Reward Creator**
- Creates bounties in rewards store
- Sets credit costs
- Receives notification when claimed
- Rewards are assigned to specific users

**Note**: All roles overlap—every user can create tasks, complete tasks, and create/claim rewards.

---

## Core Flows

### Flow 1: Task Assignment → Completion → Credit Award
```
Creator              Assignee               System
   |                     |                      |
   |-- Create Task ----->|                      |
   |   (title, reward)   |                      |
   |                     |                      |
   |                     |-- View Task -------->|
   |                     |                      |
   |                     |-- Submit Proof ----->|
   |                     |   (photo/video)      |
   |                     |                      |
   |<-- Review Request --|                      |
   |                     |                      |
   |-- Approve --------->|                      |
   |                     |                      |
   |                     |<-- Credits Awarded --|
   |                     |   (RPC: increment)   |
```

### Flow 2: Rewards Store Purchase
```
Creator              Buyer                  System
   |                     |                      |
   |-- Create Bounty --->|                      |
   |   (credit_cost)     |                      |
   |                     |                      |
   |                     |-- View Store ------->|
   |                     |                      |
   |                     |-- Claim Bounty ----->|
   |                     |   (RPC: purchase)    |
   |                     |                      |
   |                     |<-- Credits Deducted -|
   |                     |                      |
   |<-- Notification ----|                      |
   |   (Edge Function)   |                      |
```

### Flow 3: Friend Request
```
Requester            Recipient              System
   |                     |                      |
   |-- Search Email ---->|                      |
   |                     |                      |
   |-- Send Request ---->|                      |
   |   (friendships)     |                      |
   |                     |                      |
   |                     |<-- Notification -----|
   |                     |                      |
   |                     |-- Accept/Reject ---->|
   |                     |                      |
   |<-- Status Update ---|                      |
   |   (real-time sync)  |                      |
```

---

## Glossary

| Term | Definition |
|------|------------|
| **Contract** | A task/mission assigned to a friend with a credit reward |
| **Bounty** | A reward item in the rewards store claimable with credits |
| **Hunter** | User completing tasks to earn credits |
| **Guild** | Your network of friends (via friendships table) |
| **Credits** | Virtual currency earned from tasks, spent on bounties |
| **Proof** | Photo/video/text evidence of task completion |
| **Instance** | Single occurrence of a recurring task (unused feature) |
| **Template** | Recurring task definition (unused feature) |
| **RLS** | Row-Level Security - Supabase authorization layer |
| **RPC** | Remote Procedure Call - Supabase server-side function |
| **Edge Function** | Serverless Deno function (Supabase) |

---

## Repository Structure

```
bounty-hunter-app/
├── docs/                           # Documentation (this folder)
│   ├── overview.md                 # This file
│   ├── architecture.md             # System design & components
│   ├── data-model.md               # Database schema & ERD
│   ├── api-map.md                  # All endpoints & RPCs
│   ├── state-and-events.md         # State management & flows
│   ├── runbook.md                  # Setup & deployment guide
│   └── open-questions.md           # Ambiguities & blockers
│
├── src/                            # Frontend React app
│   ├── pages/                      # Route components
│   │   ├── Login.tsx               # Magic link authentication
│   │   ├── Dashboard.tsx           # Assigned contracts view
│   │   ├── IssuedPage.tsx          # Created contracts view
│   │   ├── Friends.tsx             # Guild management
│   │   ├── ArchivePage.tsx         # Completed task history
│   │   ├── RewardsStorePage.tsx    # Bounty marketplace
│   │   ├── MyCollectedRewardsPage.tsx  # Claimed rewards (stub)
│   │   └── ProfileEdit.tsx         # User profile settings
│   │
│   ├── components/                 # Reusable UI components
│   │   ├── Layout.tsx              # App shell & navigation
│   │   ├── TaskCard.tsx            # Contract display card
│   │   ├── RewardCard.tsx          # Bounty display card
│   │   ├── FriendCard.tsx          # Friend list item
│   │   ├── *Modal.tsx              # Various modal dialogs
│   │   └── UserCredits.tsx         # Credit balance widget
│   │
│   ├── hooks/                      # Custom React hooks
│   │   ├── useAuth.ts              # Authentication state
│   │   ├── useTasks.ts             # Task CRUD operations
│   │   ├── useFriends.ts           # Friend system logic
│   │   ├── useRewardsStore.ts      # Bounty marketplace
│   │   ├── useCollectedRewards.ts  # Claimed rewards
│   │   ├── useAssignedContracts.ts # Tasks assigned to user
│   │   ├── useIssuedContracts.ts   # Tasks created by user
│   │   └── useArchivedContracts.ts # Completed tasks
│   │
│   ├── context/                    # React Context providers
│   │   └── UIContext.tsx           # Global UI state (mobile menu)
│   │
│   ├── lib/                        # Utilities & integrations
│   │   ├── supabase.ts             # Supabase client init
│   │   └── quotes.ts               # Daily quote data
│   │
│   ├── types/                      # TypeScript definitions
│   │   ├── database.ts             # Auto-generated Supabase types
│   │   ├── custom.ts               # Manual type extensions
│   │   ├── rpc-types.ts            # RPC function types
│   │   └── app-specific-types.ts   # Custom app types
│   │
│   ├── utils/                      # Helper functions
│   │   ├── getErrorMessage.ts      # Error categorization
│   │   ├── soundManager.ts         # Audio playback
│   │   └── dateUtils.ts            # Date helpers
│   │
│   ├── i18n/                       # Internationalization
│   │   ├── index.ts                # i18next config
│   │   └── locales/                # Translation files (en, de)
│   │
│   ├── App.tsx                     # Root component & routing
│   └── main.tsx                    # React entry point
│
├── supabase/                       # Supabase backend
│   ├── migrations/                 # SQL migrations
│   │   ├── 20231117000000_complete_task_instance.sql
│   │   ├── YYYYMMDDHHMMSS_create_bounties_table.sql
│   │   ├── YYYYMMDDHHMMSS_create_bounty_rpc.sql
│   │   ├── YYYYMMDDHHMMSS_create_collected_bounties_table.sql
│   │   ├── YYYYMMDDHHMMSS_increment_user_credits_rpc.sql
│   │   ├── YYYYMMDDHHMMSS_decrement_user_credits_rpc.sql
│   │   ├── YYYYMMDDHHMMSS_purchase_bounty_rpc.sql
│   │   ├── 20250615195100_add_proof_required_to_task_instances.sql
│   │   └── 20250615224500_create_or_update_recurring_task_instances.sql
│   │
│   └── functions/                  # Edge Functions
│       └── notify-reward-creator/  # Email notification on purchase
│           └── index.ts
│
├── public/                         # Static assets
├── .git/                           # Git repository
├── node_modules_old/               # Legacy dependencies (unused)
├── supabse/                        # Typo folder (duplicate?)
│
├── package.json                    # Dependencies & scripts
├── package-lock.json               # Locked dependency versions
├── vite.config.ts                  # Vite build config
├── tsconfig.json                   # TypeScript config
├── tailwind.config.js              # Tailwind CSS config
├── postcss.config.js               # PostCSS config
├── eslint.config.js                # ESLint config
├── vercel.json                     # Vercel deployment config
├── index.html                      # HTML entry point
│
├── INSTRUCTIONS.md                 # Original project requirements
├── TODO.md                         # Development checklist
├── MANUAL_TASKS.md                 # Manual setup instructions
├── get-refresh-token.cjs/mjs       # OAuth token utilities
│
└── logo*.png                       # Brand assets
```

---

## Tech Stack

### Frontend
- **Framework**: React 18.3.1 (via Vite 6.3.5)
- **Language**: TypeScript 5.5.3
- **Routing**: React Router DOM v6
- **Styling**: TailwindCSS 3.4.1 (glassmorphic design)
- **UI Libraries**: Lucide React (icons), React Confetti, React Dropzone, React Hook Form
- **Animations**: Anime.js
- **i18n**: i18next (English, German)

### Backend (Supabase)
- **Database**: PostgreSQL (via Supabase)
- **Authentication**: Magic Link (OTP via email)
- **Storage**: Supabase Storage (buckets: `bounty-proofs`, `avatars`)
- **Real-time**: Supabase Realtime (postgres_changes subscriptions)
- **Edge Functions**: Deno (TypeScript) - `notify-reward-creator`
- **RPC Functions**: PL/pgSQL stored procedures

### Deployment
- **Hosting**: Vercel (frontend)
- **Backend**: Supabase Cloud

---

## Top 10 Risks

### Critical
1. **🔴 SECURITY: RLS Policies Incomplete**
   - [supabase/migrations/YYYYMMDDHHMMSS_create_bounties_table.sql:19-29](../supabase/migrations/YYYYMMDDHHMMSS_create_bounties_table.sql#L19-L29) - `bounties` table exists but code queries `rewards_store`
   - **Impact**: Potential unauthorized data access
   - **Location**: Schema mismatch between migrations and app code

2. **🔴 DATA INTEGRITY: Credit Manipulation Risk**
   - [supabase/migrations/YYYYMMDDHHMMSS_increment_user_credits_rpc.sql:26](../supabase/migrations/YYYYMMDDHHMMSS_increment_user_credits_rpc.sql#L26) - `increment_user_credits` granted to `authenticated` role
   - [src/pages/IssuedPage.tsx:165](../src/pages/IssuedPage.tsx#L165) - Direct RPC call from client
   - **Impact**: Users can award themselves unlimited credits
   - **Fix**: Move to service_role-only or enforce RLS on credit changes

3. **🔴 SCHEMA DRIFT: Table Name Confusion**
   - Migrations define `bounties` table
   - App code queries `rewards_store` table
   - **Impact**: App will fail if migrations are run as-is
   - **Locations**: All reward-related hooks reference `rewards_store`

4. **🟡 IDEMPOTENCY: Duplicate Credit Awards**
   - [src/pages/IssuedPage.tsx:165](../src/pages/IssuedPage.tsx#L165) - No deduplication on task approval
   - **Impact**: Repeated approvals could award credits multiple times
   - **Fix**: Add completed_at check or use transaction-safe RPC

5. **🟡 AUTH: Service Role Key Exposure**
   - [supabase/functions/notify-reward-creator/index.ts:57](../supabase/functions/notify-reward-creator/index.ts#L57) - `SUPABASE_SERVICE_ROLE_KEY` in edge function
   - **Impact**: Acceptable in edge functions, but ensure key is not logged
   - **Status**: Likely safe, but audit logs

6. **🟡 FILE SECURITY: Unvalidated Proof Uploads**
   - [src/hooks/useTasks.ts:532](../src/hooks/useTasks.ts#L532) - File upload to `bounty-proofs` bucket
   - **Impact**: No server-side validation (type, size, malware)
   - **Fix**: Add storage bucket policies and server-side validation

7. **🟡 RACE CONDITION: Concurrent Bounty Purchases**
   - [supabase/migrations/YYYYMMDDHHMMSS_purchase_bounty_rpc.sql:26-30](../supabase/migrations/YYYYMMDDHHMMSS_purchase_bounty_rpc.sql#L26-L30) - Check for duplicate purchase
   - **Impact**: Race condition window between check and insert
   - **Fix**: Use UNIQUE constraint instead of IF EXISTS

8. **🟡 NOTIFICATION FAILURE: Email Not Sent**
   - [supabase/functions/notify-reward-creator/index.ts:11-44](../supabase/functions/notify-reward-creator/index.ts#L11-L44) - Email function is a mock
   - **Impact**: Reward creators never notified of purchases
   - **Fix**: Integrate real email service (Resend, SendGrid)

9. **🟡 ORPHANED DATA: Recurring Task Tables Unused**
   - [supabase/migrations/20250615224500_create_or_update_recurring_task_instances.sql:7](../supabase/migrations/20250615224500_create_or_update_recurring_task_instances.sql#L7) - `recurring_task_instances` table
   - **Impact**: Dead code increases complexity
   - **Fix**: Remove or implement recurring task feature

10. **🟢 UX: Incomplete Features**
    - [src/pages/MyCollectedRewardsPage.tsx](../src/pages/MyCollectedRewardsPage.tsx) - Placeholder page
    - **Impact**: Poor UX for users expecting to see collected rewards
    - **Fix**: Implement full UI using `useCollectedRewards` hook

---

## Top 10 Fast Fixes

### Quick Wins (< 1 hour each)

1. **✅ Fix Email Notifications**
   - [supabase/functions/notify-reward-creator/index.ts:11-44](../supabase/functions/notify-reward-creator/index.ts#L11-L44)
   - **Action**: Integrate Resend API (code already commented in file)
   - **Effort**: 30 minutes

2. **✅ Add Unique Constraint on Collected Rewards**
   - [supabase/migrations/YYYYMMDDHHMMSS_create_collected_bounties_table.sql](../supabase/migrations/YYYYMMDDHHMMSS_create_collected_bounties_table.sql)
   - **Action**: `ALTER TABLE collected_rewards ADD CONSTRAINT unique_collection UNIQUE(reward_id, collector_id);`
   - **Effort**: 5 minutes

3. **✅ Implement MyCollectedRewardsPage**
   - [src/pages/MyCollectedRewardsPage.tsx](../src/pages/MyCollectedRewardsPage.tsx)
   - **Action**: Copy pattern from `ArchivePage.tsx`, use `useCollectedRewards` hook
   - **Effort**: 45 minutes

4. **✅ Remove Authenticated Access to increment_user_credits**
   - [supabase/migrations/YYYYMMDDHHMMSS_increment_user_credits_rpc.sql:26](../supabase/migrations/YYYYMMDDHHMMSS_increment_user_credits_rpc.sql#L26)
   - **Action**: `REVOKE EXECUTE ON FUNCTION increment_user_credits FROM authenticated;`
   - **Effort**: 10 minutes
   - **Note**: Move credit awarding to server-side trigger or service_role call

5. **✅ Add File Size/Type Validation to Proof Upload**
   - [src/hooks/useTasks.ts:532](../src/hooks/useTasks.ts#L532)
   - **Action**: Add bucket policy limiting file types and max size
   - **Effort**: 20 minutes

6. **✅ Align Schema: Rename `bounties` to `rewards_store` in Migrations**
   - [supabase/migrations/YYYYMMDDHHMMSS_create_bounties_table.sql](../supabase/migrations/YYYYMMDDHHMMSS_create_bounties_table.sql)
   - **Action**: Update migration to use `rewards_store` table name
   - **Effort**: 15 minutes

7. **✅ Add Idempotency Check on Task Approval**
   - [src/pages/IssuedPage.tsx:165](../src/pages/IssuedPage.tsx#L165)
   - **Action**: Check if task already completed before awarding credits
   - **Effort**: 10 minutes

8. **✅ Delete Unused `supabse` Folder**
   - [Root folder](../supabse/)
   - **Action**: `rm -rf supabse`
   - **Effort**: 1 minute

9. **✅ Add Loading States to All Modals**
   - [src/components/*.tsx](../src/components/)
   - **Action**: Audit all modals for missing loading/error states
   - **Effort**: 30 minutes

10. **✅ Document Environment Variables**
    - [No .env.example exists](../.env.example)
    - **Action**: Create `.env.example` with all required vars
    - **Effort**: 10 minutes

---

## Summary Statistics

- **Total Tables**: 9 (profiles, tasks, friendships, rewards_store, collected_rewards, user_credits, credit_transactions, marketplace_bounties, recurring_task_instances)
- **RPC Functions**: 6 (create_reward_store_item, delete_reward_store_item, update_reward_store_item, increment_user_credits, decrement_user_credits, purchase_bounty)
- **Edge Functions**: 1 (notify-reward-creator)
- **Storage Buckets**: 2 (bounty-proofs, avatars)
- **React Pages**: 9
- **Custom Hooks**: 15+
- **Components**: 25+
- **Supported Languages**: 2 (English, German)
- **Migration Files**: 9

---

**Last Updated**: 2025-10-25
**Maintainer**: Code Cartographer
**Next Review**: After schema alignment and security fixes
