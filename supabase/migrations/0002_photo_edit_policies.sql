-- Editing a caption: any member of the album can edit captions on photos in it.
create policy "Members can update photos in their albums"
  on public.photos for update
  to authenticated
  using (
    exists (
      select 1 from public.album_members
      where album_members.album_id = photos.album_id
      and album_members.user_id = auth.uid()
    )
  );

-- Deleting a photo: the uploader can delete their own, and the album owner can
-- delete any photo in their album (basic moderation).
create policy "Uploader or album owner can delete photos"
  on public.photos for delete
  to authenticated
  using (
    uploaded_by = auth.uid()
    or exists (
      select 1 from public.albums
      where albums.id = photos.album_id
      and albums.owner_id = auth.uid()
    )
  );
