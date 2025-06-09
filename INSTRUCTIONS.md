# CURSOR AI - TASK BOUNTIES WEB PROJECT

You are building a React TypeScript web app called "Task Bounties" with the following requirements:

## PROJECT OVERVIEW
- Single-page app where users assign tasks to friends with physical rewards
- Google authentication via Supabase
- Users can create tasks, assign them to friends, and upload proof of completion
- Beautiful glassmorphic UI with deep indigo/teal gradient design
- Must be deployed to Vercel tonight

## TECH STACK
- Vite + React 18 + TypeScript
- Supabase (auth, database, storage)
- TailwindCSS (full version, not CDN)
- React Router for navigation
- No external UI libraries except Tailwind

## CORE FEATURES
1. Google OAuth login
2. Friend system (send/accept requests)
3. Create tasks with title, deadline, and reward text
4. Assign tasks to friends
5. Upload photo/video proof of completion
6. View earned vs given rewards
7. Real-time updates when tasks are completed

## DESIGN REQUIREMENTS
- Dark theme with glassmorphic cards (backdrop-blur-md bg-white/10)
- Indigo-900 background with teal-to-cyan gradient accents
- Rounded corners (rounded-2xl for cards)
- Smooth animations with CSS transitions
- Mobile-responsive

## DATABASE SCHEMA
Use these exact table names and columns:
- profiles (id, email, display_name, avatar_url, created_at)
- friendships (id, user1_id, user2_id, status, requested_by, created_at)
- tasks (id, created_by, assigned_to, title, deadline, reward_type, reward_text, status, proof_url, proof_type, completed_at, created_at)

## IMPORTANT CONSTRAINTS
- Keep components under 200 lines each
- Use proper TypeScript types (no 'any')
- All Supabase calls must have error handling
- File uploads limited to 10MB
- Only image/video file types for proofs
- Use environment variables for all keys

## FILE STRUCTURE TO CREATE
```
task-bounties-web/
├── src/
│   ├── lib/
│   │   └── supabase.ts
│   ├── types/
│   │   └── database.ts
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── useTasks.ts
│   │   └── useFriends.ts
│   ├── components/
│   │   ├── Layout.tsx
│   │   ├── TaskCard.tsx
│   │   ├── TaskForm.tsx
│   │   ├── ProofModal.tsx
│   │   └── FriendCard.tsx
│   ├── pages/
│   │   ├── Login.tsx
│   │   ├── Dashboard.tsx
│   │   └── Friends.tsx
│   ├── App.tsx
│   └── main.tsx
├── .env.local
└── [config files]
```

Follow the tasks in TODO.md sequentially. Ask for clarification if needed, but aim to complete each task fully before moving to the next.