-- Let the album owner remove members (any non-owner membership row in an
-- album they own). The owner's own row (role = 'owner') can't be removed.
create policy "Owner can remove members"
  on public.album_members for delete
  to authenticated
  using (
    role <> 'owner'
    and exists (
      select 1 from public.albums
      where albums.id = album_members.album_id
      and albums.owner_id = auth.uid()
    )
  );
