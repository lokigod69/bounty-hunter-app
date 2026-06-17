-- Run in Supabase SQL editor after applying migrations.
-- These checks verify repo-defined storage buckets and policies exist.

select
  id,
  public,
  file_size_limit,
  allowed_mime_types
from storage.buckets
where id in ('bounty-proofs', 'reward-images', 'avatars')
order by id;

select
  policyname,
  cmd,
  roles,
  qual,
  with_check
from pg_policies
where schemaname = 'storage'
  and tablename = 'objects'
  and policyname in (
    'bounty proofs participants can read',
    'bounty proofs assignee can upload',
    'bounty proofs assignee can update',
    'bounty proofs participants can delete',
    'reward images are public',
    'reward image creator can upload',
    'reward image creator can update',
    'reward image creator can delete',
    'avatars are public',
    'avatar owner can upload',
    'avatar owner can update',
    'avatar owner can delete'
  )
order by policyname;

-- Manual behavior checks:
-- 1. bounty-proofs is private and unauthenticated public URL reads fail.
-- 2. A task assignee can upload to proofs/{task_id}/... only for their assigned task.
-- 3. A task creator and assignee can read/delete proof objects for that task.
-- 4. A non-participant cannot read, upload, update, or delete proof objects.
-- 5. reward-images and avatars are public-read, but writes are limited to owner path prefixes.
