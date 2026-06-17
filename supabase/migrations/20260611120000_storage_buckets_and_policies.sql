-- V1 storage bucket source of truth.
-- Buckets used by app code:
-- - bounty-proofs: proof uploads under proofs/{task_id}/... (public = false)
-- - reward-images: reward images under rewards/{creator_id}/...
-- - avatars: profile images under {user_id}/...

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('bounty-proofs', 'bounty-proofs', false, 10485760, array[
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'video/mp4',
    'video/quicktime',
    'video/webm'
  ]),
  ('reward-images', 'reward-images', true, 5242880, array[
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp'
  ]),
  ('avatars', 'avatars', true, 5242880, array[
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp'
  ])
on conflict (id) do update
set
  name = excluded.name,
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "bounty proofs participants can read" on storage.objects;
drop policy if exists "bounty proofs assignee can upload" on storage.objects;
drop policy if exists "bounty proofs assignee can update" on storage.objects;
drop policy if exists "bounty proofs participants can delete" on storage.objects;

create policy "bounty proofs participants can read"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'bounty-proofs'
  and (storage.foldername(name))[1] = 'proofs'
  and (storage.foldername(name))[2] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  and exists (
    select 1
    from public.tasks
    where tasks.id = ((storage.foldername(name))[2])::uuid
      and (
        tasks.assigned_to = auth.uid()
        or tasks.created_by = auth.uid()
      )
  )
);

create policy "bounty proofs assignee can upload"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'bounty-proofs'
  and (storage.foldername(name))[1] = 'proofs'
  and (storage.foldername(name))[2] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  and exists (
    select 1
    from public.tasks
    where tasks.id = ((storage.foldername(name))[2])::uuid
      and tasks.assigned_to = auth.uid()
  )
);

create policy "bounty proofs assignee can update"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'bounty-proofs'
  and (storage.foldername(name))[1] = 'proofs'
  and (storage.foldername(name))[2] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  and exists (
    select 1
    from public.tasks
    where tasks.id = ((storage.foldername(name))[2])::uuid
      and tasks.assigned_to = auth.uid()
  )
)
with check (
  bucket_id = 'bounty-proofs'
  and (storage.foldername(name))[1] = 'proofs'
  and (storage.foldername(name))[2] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  and exists (
    select 1
    from public.tasks
    where tasks.id = ((storage.foldername(name))[2])::uuid
      and tasks.assigned_to = auth.uid()
  )
);

create policy "bounty proofs participants can delete"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'bounty-proofs'
  and (storage.foldername(name))[1] = 'proofs'
  and (storage.foldername(name))[2] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  and exists (
    select 1
    from public.tasks
    where tasks.id = ((storage.foldername(name))[2])::uuid
      and (
        tasks.assigned_to = auth.uid()
        or tasks.created_by = auth.uid()
      )
  )
);

drop policy if exists "reward images are public" on storage.objects;
drop policy if exists "reward image creator can upload" on storage.objects;
drop policy if exists "reward image creator can update" on storage.objects;
drop policy if exists "reward image creator can delete" on storage.objects;

create policy "reward images are public"
on storage.objects
for select
to public
using (bucket_id = 'reward-images');

create policy "reward image creator can upload"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'reward-images'
  and (storage.foldername(name))[1] = 'rewards'
  and (storage.foldername(name))[2] = auth.uid()::text
);

create policy "reward image creator can update"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'reward-images'
  and (storage.foldername(name))[1] = 'rewards'
  and (storage.foldername(name))[2] = auth.uid()::text
)
with check (
  bucket_id = 'reward-images'
  and (storage.foldername(name))[1] = 'rewards'
  and (storage.foldername(name))[2] = auth.uid()::text
);

create policy "reward image creator can delete"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'reward-images'
  and (storage.foldername(name))[1] = 'rewards'
  and (storage.foldername(name))[2] = auth.uid()::text
);

drop policy if exists "avatars are public" on storage.objects;
drop policy if exists "avatar owner can upload" on storage.objects;
drop policy if exists "avatar owner can update" on storage.objects;
drop policy if exists "avatar owner can delete" on storage.objects;

create policy "avatars are public"
on storage.objects
for select
to public
using (bucket_id = 'avatars');

create policy "avatar owner can upload"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "avatar owner can update"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "avatar owner can delete"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);
