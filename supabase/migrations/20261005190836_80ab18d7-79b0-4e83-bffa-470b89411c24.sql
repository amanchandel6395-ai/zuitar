revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.has_role(uuid, app_role) from public, anon;
create policy "own files read" on storage.objects for select to authenticated using (bucket_id = 'creations' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "own files insert" on storage.objects for insert to authenticated with check (bucket_id = 'creations' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "own files delete" on storage.objects for delete to authenticated using (bucket_id = 'creations' and (storage.foldername(name))[1] = auth.uid()::text);