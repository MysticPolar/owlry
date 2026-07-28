-- ============================================================
-- owlry — private cross-device shelf for uploaded book copies.
--
-- Signed-in readers get a personal folder in the `owlry-uploads`
-- bucket; the client mirrors uploads to it and other devices pull
-- from it. Object paths are `<user_id>/<book_id>.<format>`, and
-- every policy pins the first path segment to auth.uid(), so a
-- reader can only ever see or touch their own copies. The bucket
-- is private (no public URLs); downloads ride the authed API.
-- Guests never reach this bucket — their uploads stay on-device.
-- ============================================================

insert into storage.buckets (id, name, public, file_size_limit)
values ('owlry-uploads', 'owlry-uploads', false, 52428800) -- 50 MB per file
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit;

drop policy if exists "owlry uploads select own" on storage.objects;
create policy "owlry uploads select own" on storage.objects
  for select to authenticated
  using (bucket_id = 'owlry-uploads' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "owlry uploads insert own" on storage.objects;
create policy "owlry uploads insert own" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'owlry-uploads' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "owlry uploads update own" on storage.objects;
create policy "owlry uploads update own" on storage.objects
  for update to authenticated
  using (bucket_id = 'owlry-uploads' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'owlry-uploads' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "owlry uploads delete own" on storage.objects;
create policy "owlry uploads delete own" on storage.objects
  for delete to authenticated
  using (bucket_id = 'owlry-uploads' and (storage.foldername(name))[1] = auth.uid()::text);
