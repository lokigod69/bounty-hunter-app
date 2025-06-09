# TODO.md - Task Bounties Web Implementation

## Phase 1: Project Bootstrap
- [ ] Initialize Vite project with React-TS template
- [ ] Install all dependencies: @supabase/supabase-js @supabase/auth-helpers-react react-router-dom
- [ ] Set up TailwindCSS with PostCSS
- [ ] Create folder structure as specified
- [ ] Add .env.local with placeholder values

## Phase 2: Supabase Client & Types
- [ ] Create src/lib/supabase.ts with client initialization
- [ ] Generate TypeScript types in src/types/database.ts
- [ ] Set up auth helpers configuration

## Phase 3: Authentication Flow
- [ ] Create Login.tsx with Google OAuth button
- [ ] Implement useAuth.ts hook with login/logout/user state
- [ ] Set up App.tsx with protected routes
- [ ] Create Layout.tsx with auth check

## Phase 4: Navigation & Layout
- [ ] Build Layout.tsx with top navigation bar
- [ ] Add user profile display (avatar + name)
- [ ] Implement logout button
- [ ] Add mobile-responsive menu
- [ ] Style with glassmorphic design

## Phase 5: Dashboard Page
- [ ] Create Dashboard.tsx with two tabs (Assigned to Me / My Tasks)
- [ ] Add floating action button for new tasks
- [ ] Implement empty states
- [ ] Add loading skeletons

## Phase 6: Task Components
- [ ] Build TaskCard.tsx with all task details
- [ ] Create TaskForm.tsx modal for new tasks
- [ ] Add friend selector dropdown (fetch from friendships)
- [ ] Implement reward type selector (cash/service/voucher)
- [ ] Add date picker for deadline

## Phase 7: Task CRUD Operations
- [ ] Create useTasks.ts hook with all operations
- [ ] Implement createTask function
- [ ] Add updateTask for status changes
- [ ] Set up real-time subscription for task updates
- [ ] Handle optimistic updates

## Phase 8: Proof Upload System
- [ ] Create ProofModal.tsx for uploading proof
- [ ] Implement file upload to Supabase storage
- [ ] Add file type/size validation
- [ ] Update task with proof_url after upload
- [ ] Show upload progress

## Phase 9: Friends System
- [ ] Create Friends.tsx page
- [ ] Build FriendCard.tsx component
- [ ] Implement useFriends.ts hook
- [ ] Add search by email functionality
- [ ] Handle friend request accept/reject

## Phase 10: Rewards Summary
- [ ] Add rewards section to Dashboard
- [ ] Calculate earned rewards (tasks assigned to me)
- [ ] Calculate given rewards (tasks I created)
- [ ] Display reward counts by type

## Phase 11: Real-time Features
- [ ] Set up Supabase real-time for tasks table
- [ ] Add notification when task is completed
- [ ] Update UI automatically on changes
- [ ] Handle connection states

## Phase 12: Polish & Error Handling
- [ ] Add error boundaries
- [ ] Implement toast notifications
- [ ] Add loading states everywhere
- [ ] Test all error scenarios
- [ ] Ensure mobile responsiveness

## Phase 13: Final Testing
- [ ] Test complete task flow
- [ ] Verify friend system works
- [ ] Check file uploads
- [ ] Test on mobile devices
- [ ] Fix any remaining bugs