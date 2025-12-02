# MANUAL TASKS - Your Checklist (15 minutes max)

## 1. Supabase Setup (10 min)
- [ ] Go to supabase.com and create new project
- [ ] Copy these credentials to notepad:
  - Project URL
  - Anon Key
  - Service Role Key (Settings > API)

## 2. Enable Google Auth (3 min)
- [ ] Supabase Dashboard > Authentication > Providers
- [ ] Enable Google
- [ ] Add your Google OAuth credentials
- [ ] Set redirect URL: http://localhost:5173 (for dev)

## 3. Run Database Schema (2 min)
- [ ] Go to SQL Editor in Supabase
- [ ] Copy and run this exact SQL:

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Profiles table
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name, avatar_url)
  VALUES (
    new.id, 
    new.email,
    SPLIT_PART(new.email, '@', 1),
    new.raw_user_meta_data->>'avatar_url'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Friendships
CREATE TABLE friendships (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user1_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  user2_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending',
  requested_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_friendship UNIQUE(user1_id, user2_id),
  CONSTRAINT no_self_friendship CHECK (user1_id != user2_id)
);

-- Tasks
CREATE TABLE tasks (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  created_by UUID REFERENCES profiles(id) ON DELETE CASCADE,
  assigned_to UUID REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  deadline DATE,
  reward_type TEXT CHECK (reward_type IN ('cash', 'service', 'voucher')),
  reward_text TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed')),
  proof_url TEXT,
  proof_type TEXT CHECK (proof_type IN ('image', 'video')),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Public profiles" ON profiles
  FOR SELECT USING (true);

CREATE POLICY "Update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Friendships policies  
CREATE POLICY "View friendships" ON friendships
  FOR SELECT USING (auth.uid() IN (user1_id, user2_id));

CREATE POLICY "Create friendships" ON friendships
  FOR INSERT WITH CHECK (auth.uid() = requested_by);

CREATE POLICY "Update friendships" ON friendships
  FOR UPDATE USING (auth.uid() IN (user1_id, user2_id));

-- Tasks policies
CREATE POLICY "View tasks" ON tasks
  FOR SELECT USING (auth.uid() IN (created_by, assigned_to));

CREATE POLICY "Create tasks" ON tasks
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Update tasks" ON tasks
  FOR UPDATE USING (auth.uid() IN (created_by, assigned_to));
```

## 4. Create Storage Bucket
- [ ] Go to Storage in Supabase
- [ ] Create bucket named "proofs"
- [ ] Set to private
- [ ] Add policy: Authenticated users can upload/view

## 5. After Cursor Creates Project
- [ ] Create .env.local file with:
```
VITE_SUPABASE_URL=your_project_url
VITE_SUPABASE_ANON_KEY=your_anon_key
```

## 6. For Deployment (Later)
- [ ] Add these URLs to Supabase Auth settings:
  - Site URL: https://your-app.vercel.app
  - Redirect URLs: https://your-app.vercel.app

That's it! Everything else is handled by Cursor.