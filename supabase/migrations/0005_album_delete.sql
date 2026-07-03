-- Let the owner delete their album. Cascades (defined in 0001) remove the
-- album's members, photos, guestbook entries, and book exports automatically.
create policy "Owners can delete their albums"
  on public.albums for delete
  to authenticated
  using (owner_id = auth.uid());
