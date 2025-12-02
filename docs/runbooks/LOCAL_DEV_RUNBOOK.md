# Bounty Hunter App - Runbook

## Local Development Setup

### Prerequisites

- **Node.js**: v18+ (LTS recommended)
- **npm**: v9+ (comes with Node.js)
- **Supabase CLI**: v1.8+ (for local development)
- **Git**: Latest version
- **Code Editor**: VS Code recommended

### Environment Setup

#### 1. Clone Repository

```bash
git clone <repository-url>
cd bounty-hunter-app
```

#### 2. Install Dependencies

```bash
npm install
```

**Expected Time**: 2-3 minutes

#### 3. Create Environment File

Create `.env.local` in project root:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

**Where to Find Values**:
1. Go to [supabase.com](https://supabase.com)
2. Navigate to your project
3. Settings > API
4. Copy:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon public key** → `VITE_SUPABASE_ANON_KEY`

⚠️ **Never commit `.env.local` to Git** (already in `.gitignore`)

---

### Database Setup

#### Option A: Use Existing Supabase Project

If you have an existing Supabase project with data:

1. **Link Project**:
```bash
supabase link --project-ref <your-project-ref>
```

2. **Pull Remote Schema** (optional, to sync local):
```bash
supabase db pull
```

3. **Done** - Skip to "Run Development Server"

---

#### Option B: Create New Supabase Project

1. **Go to** [supabase.com/dashboard](https://supabase.com/dashboard)

2. **Create New Project**:
   - Organization: Your org
   - Name: `bounty-hunter-app`
   - Database Password: Generate strong password (save it!)
   - Region: Choose closest to you

3. **Wait for provisioning** (1-2 minutes)

4. **Get Credentials** (see step 3 above)

---

### Run Migrations

⚠️ **IMPORTANT**: Migrations have issues. See [open-questions.md](./open-questions.md#1-migration-files-have-placeholder-timestamps) before running.

**Fix Required First**:
1. Rename migration files with proper timestamps:
   ```
   YYYYMMDDHHMMSS_*.sql → 20250101120000_*.sql
   ```

2. Align table names (see [data-model.md - Schema Discrepancies](./data-model.md#schema-discrepancies--issues)):
   - `bounties` → `rewards_store`
   - `collected_bounties` → `collected_rewards`

**After Fixes**:

```bash
# Option 1: Via Supabase CLI
supabase db push

# Option 2: Via Supabase Dashboard
# Copy SQL from each migration file
# Paste into SQL Editor
# Execute in chronological order
```

**Expected Result**:
- 9 tables created: `profiles`, `tasks`, `friendships`, `rewards_store`, `collected_rewards`, `user_credits`, `credit_transactions`, `marketplace_bounties`, `recurring_task_instances`
- 7 RPC functions: `create_reward_store_item`, `update_reward_store_item`, `delete_reward_store_item`, `purchase_bounty`, `increment_user_credits`, `decrement_user_credits`, `complete_task_instance`
- RLS policies enabled on all tables

---

### Create Storage Buckets

**Manually via Supabase Dashboard**:

1. **Go to** Storage section

2. **Create `bounty-proofs` bucket**:
   - Name: `bounty-proofs`
   - Public: Yes (✅ Public bucket)
   - File size limit: 10 MB
   - Allowed MIME types: `image/*`, `video/*`

3. **Create `avatars` bucket**:
   - Name: `avatars`
   - Public: Yes
   - File size limit: 5 MB
   - Allowed MIME types: `image/*`

4. **Set Policies**:

   For `bounty-proofs`:
   ```sql
   -- Allow authenticated users to upload
   CREATE POLICY "Authenticated users can upload"
   ON storage.objects FOR INSERT
   TO authenticated
   WITH CHECK (bucket_id = 'bounty-proofs');

   -- Allow anyone to view
   CREATE POLICY "Anyone can view"
   ON storage.objects FOR SELECT
   TO public
   USING (bucket_id = 'bounty-proofs');

   -- Allow users to delete their own files
   CREATE POLICY "Users can delete their files"
   ON storage.objects FOR DELETE
   TO authenticated
   USING (bucket_id = 'bounty-proofs');
   ```

   For `avatars`:
   ```sql
   -- Same policies as bounty-proofs
   CREATE POLICY "Authenticated users can upload"
   ON storage.objects FOR INSERT
   TO authenticated
   WITH CHECK (bucket_id = 'avatars');

   CREATE POLICY "Anyone can view"
   ON storage.objects FOR SELECT
   TO public
   USING (bucket_id = 'avatars');
   ```

---

### Enable Authentication

**Supabase Dashboard**:

1. Go to **Authentication > Providers**

2. **Enable Email (OTP)**:
   - Toggle: On
   - Confirm email: Off (for dev, enable in production)

3. **Configure Email Templates** (optional):
   - Magic Link template: Customize if desired

4. **Add Redirect URLs**:
   - Development: `http://localhost:5173`
   - Production: `https://your-domain.com` (when deploying)

⚠️ **Google OAuth Not Configured**: Original requirements mentioned Google auth, but current implementation uses magic links only.

---

### Run Development Server

```bash
npm run dev
```

**Output**:
```
  VITE v6.3.5  ready in 500 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

**Open**: [http://localhost:5173](http://localhost:5173)

---

## Development Workflow

### File Watching

Vite automatically watches for file changes and hot-reloads:
- Component changes: Instant HMR (Hot Module Replacement)
- TypeScript errors: Shown in terminal and browser console
- CSS changes: Instant update without reload

### Type Checking

```bash
# Run TypeScript compiler check
npm run build

# Or use VS Code "Problems" panel for real-time errors
```

### Linting

```bash
npm run lint
```

**Fix Auto-Fixable Issues**:
```bash
npx eslint . --fix
```

---

## Testing

⚠️ **No Tests Configured**: This project has no test suite.

**Recommended Setup**:
1. Add Vitest for unit tests
2. Add React Testing Library for component tests
3. Add Playwright for E2E tests

---

## Database Management

### View Database Schema

**Supabase Dashboard**:
- Go to **Database > Tables**
- Select table to view columns, relationships, policies

**Via CLI**:
```bash
supabase db dump --schema public > schema.sql
```

---

### Manual Queries

**Supabase Dashboard > SQL Editor**:

Example queries:

```sql
-- View all users
SELECT * FROM profiles;

-- View tasks with creator/assignee names
SELECT
  t.*,
  c.display_name AS creator_name,
  a.display_name AS assignee_name
FROM tasks t
JOIN profiles c ON t.created_by = c.id
JOIN profiles a ON t.assigned_to = a.id;

-- Check user credits
SELECT * FROM user_credits;

-- View credit transactions
SELECT
  ct.*,
  p.display_name AS user_name,
  t.title AS task_title
FROM credit_transactions ct
JOIN profiles p ON ct.user_id = p.id
LEFT JOIN tasks t ON ct.task_id = t.id
ORDER BY ct.created_at DESC;
```

---

### Reset Database (Nuclear Option)

⚠️ **This will delete all data!**

```bash
# Via Supabase CLI (local project)
supabase db reset

# Via Dashboard (remote project)
# Go to Settings > Database
# Scroll to "Reset Database"
# Type project name to confirm
```

---

## Seeding Test Data

⚠️ **No Seed Script Provided**

**Manual Seeding**:

1. **Create Test Users**:
   - Go to `/login`
   - Enter email, get magic link
   - Repeat for 2-3 test accounts

2. **Add Friends**:
   - Go to `/friends`
   - Search by email
   - Send requests between accounts

3. **Create Tasks**:
   - Go to `/issued`
   - Create tasks for test friends
   - Vary: proof_required true/false, different reward types

4. **Add Credits Manually** (for testing purchases):
   ```sql
   -- Give user 1000 credits
   INSERT INTO user_credits (user_id, balance, total_earned)
   VALUES ('<user-uuid>', 1000, 1000)
   ON CONFLICT (user_id) DO UPDATE SET balance = 1000;
   ```

5. **Create Bounties**:
   - Go to `/rewards-store`
   - Click "Create Bounty"
   - Set assigned_to = test user

---

## Deployment

### Frontend (Vercel)

#### Prerequisites
- Vercel account
- GitHub repository (for auto-deploy)

#### Steps

1. **Connect GitHub Repo**:
   - Go to [vercel.com/new](https://vercel.com/new)
   - Import repository

2. **Configure Project**:
   - Framework Preset: Vite
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm install`

3. **Set Environment Variables**:
   ```
   VITE_SUPABASE_URL=<production-supabase-url>
   VITE_SUPABASE_ANON_KEY=<production-anon-key>
   ```

4. **Deploy**:
   - Click "Deploy"
   - Wait 1-2 minutes
   - Get deployment URL

5. **Update Supabase Auth Redirect**:
   - Supabase Dashboard > Authentication > URL Configuration
   - Add Site URL: `https://your-app.vercel.app`
   - Add Redirect URL: `https://your-app.vercel.app`

#### Auto-Deploy on Git Push

- Push to `main` branch → Vercel auto-deploys
- Pull request → Preview deployment

---

### Backend (Supabase Edge Functions)

#### Deploy Edge Function

```bash
# Login to Supabase
supabase login

# Link project
supabase link --project-ref <your-project-ref>

# Deploy notify-reward-creator function
supabase functions deploy notify-reward-creator --no-verify-jwt

# Set environment variables (if using real email service)
supabase secrets set RESEND_API_KEY=<your-resend-api-key>
```

**Test Edge Function**:

```bash
curl -i --location --request POST \
  'https://<project-ref>.supabase.co/functions/v1/notify-reward-creator' \
  --header 'Authorization: Bearer <anon-key>' \
  --header 'Content-Type: application/json' \
  --data '{
    "reward_id": "<test-reward-uuid>",
    "collector_id": "<test-user-uuid>"
  }'
```

---

## Environment Variables Reference

### Development (.env.local)

```env
# Supabase Connection
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# Optional: For local Supabase development
# VITE_SUPABASE_URL=http://localhost:54321
# VITE_SUPABASE_ANON_KEY=<local-anon-key>
```

### Production (Vercel)

Same as development, but using production Supabase project.

### Edge Function Secrets

```bash
# Set via Supabase CLI
supabase secrets set RESEND_API_KEY=your_key
supabase secrets set SENDGRID_API_KEY=your_key  # If using SendGrid instead
```

---

## Troubleshooting

### Issue: "Invalid project ref"

**Cause**: Supabase CLI not linked to project

**Fix**:
```bash
supabase link --project-ref <your-project-ref>
```

Get ref from Supabase Dashboard URL: `https://supabase.com/dashboard/project/<project-ref>`

---

### Issue: "Relation 'rewards_store' does not exist"

**Cause**: Migrations created `bounties` table instead of `rewards_store`

**Fix**: See [data-model.md - Schema Discrepancies](./data-model.md#schema-discrepancies--issues)

**Quick Fix** (SQL Editor):
```sql
ALTER TABLE bounties RENAME TO rewards_store;
ALTER TABLE collected_bounties RENAME TO collected_rewards;
```

---

### Issue: "Storage bucket 'bounty-proofs' does not exist"

**Cause**: Storage buckets not created

**Fix**: See "Create Storage Buckets" section above

---

### Issue: "User can award themselves unlimited credits"

**Cause**: Security vulnerability in `increment_user_credits` RPC

**Fix**: See [overview.md - Risk #2](./overview.md#top-10-risks)

**Immediate Mitigation**:
```sql
REVOKE EXECUTE ON FUNCTION increment_user_credits(UUID, INT) FROM authenticated;
GRANT EXECUTE ON FUNCTION increment_user_credits(UUID, INT) TO service_role;
```

Then move credit awarding to server-side trigger or edge function.

---

### Issue: "Module not found" errors

**Cause**: Dependencies not installed or corrupted

**Fix**:
```bash
rm -rf node_modules package-lock.json
npm install
```

---

### Issue: Vite fails to start

**Cause**: Port 5173 already in use

**Fix**:
```bash
# Kill process on port 5173 (Windows)
netstat -ano | findstr :5173
taskkill /PID <pid> /F

# Or use different port
npm run dev -- --port 3000
```

---

### Issue: TypeScript errors in IDE

**Cause**: IDE not using workspace TypeScript version

**Fix (VS Code)**:
1. Open any `.ts` file
2. Click TypeScript version in status bar (bottom-right)
3. Select "Use Workspace Version"

---

## Monitoring & Logs

### Frontend Logs (Vercel)

- Dashboard > Project > Logs
- Real-time streaming logs
- Filter by deployment, error level

### Backend Logs (Supabase)

**Edge Functions**:
- Dashboard > Edge Functions > Select function > Logs
- View invocations, errors, duration

**Database**:
- Dashboard > Logs > Database
- Query performance, slow queries

**Auth**:
- Dashboard > Logs > Auth
- Sign-in attempts, errors

---

## Performance Optimization

### Build Optimization

**Current Bundle Size**: ~500 KB (unverified)

**Analyze Bundle**:
```bash
npm run build
npx vite-bundle-visualizer
```

**Optimize**:
1. Code splitting: `React.lazy()` for routes
2. Tree shaking: Remove unused exports
3. Image optimization: Use WebP format
4. Lazy load images: `loading="lazy"` attribute

---

### Database Optimization

**Add Missing Indexes**:
```sql
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_is_archived ON tasks(is_archived);
CREATE INDEX IF NOT EXISTS idx_rewards_store_is_active ON rewards_store(is_active);
```

**Analyze Slow Queries**:
```sql
-- Enable slow query logging (5 seconds threshold)
ALTER DATABASE postgres SET log_min_duration_statement = 5000;
```

---

## Backup & Recovery

### Database Backups

**Automated** (Supabase Pro plan):
- Daily backups (7-day retention)
- Point-in-time recovery

**Manual Backup**:
```bash
# Via CLI
supabase db dump --data-only > backup.sql

# Restore
psql -h db.your-project-ref.supabase.co -p 5432 -U postgres -d postgres < backup.sql
```

---

### Storage Backups

**Not Automated** - Files in storage buckets are not backed up automatically.

**Recommendation**: Sync to AWS S3 or Google Cloud Storage periodically.

---

## Known Pitfalls

1. **Migration Timestamps**: Files use `YYYYMMDDHHMMSS` placeholders - replace before deploy
2. **Schema Mismatch**: Migrations create `bounties`, app uses `rewards_store`
3. **RLS Policies Missing**: `rewards_store`, `user_credits`, `collected_rewards` tables lack policies
4. **Credit Exploit**: `increment_user_credits` callable by clients
5. **Email Not Sent**: `notify-reward-creator` edge function is mocked
6. **No Caching**: App refetches data on every mount (consider React Query)
7. **Recurring Tasks**: Tables exist but feature not implemented (remove or implement)
8. **Duplicate Tables**: `marketplace_bounties` and `collected_bounties` unused

---

## Quick Reference

### Common Commands

```bash
# Development
npm run dev          # Start dev server
npm run build        # Production build
npm run preview      # Preview production build
npm run lint         # Lint code

# Supabase
supabase start       # Start local Supabase (Docker required)
supabase db push     # Push migrations to remote
supabase db pull     # Pull schema from remote
supabase functions deploy <name>  # Deploy edge function
supabase link --project-ref <ref> # Link to project
```

---

### File Locations

- Environment vars: `.env.local` (create manually)
- Migrations: `supabase/migrations/`
- Edge functions: `supabase/functions/`
- Frontend entry: `src/main.tsx`
- Supabase client: `src/lib/supabase.ts`
- Type definitions: `src/types/database.ts`

---

**Last Updated**: 2025-10-25
**Next Review**: After schema alignment and production deployment.
