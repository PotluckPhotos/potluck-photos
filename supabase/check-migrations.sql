-- Read-only. Shows which migrations are applied. Any FALSE = still to run.
select
  to_regclass('public.albums')            is not null as m0001_albums,
  exists (select 1 from pg_policies where tablename='photos' and cmd='DELETE')
                                                      as m0002_photo_edit,
  exists (select 1 from pg_proc where proname='is_album_member')
                                                      as m0003_rls_fix,
  to_regclass('public.guestbook_entries') is not null as m0004_guestbook,
  exists (select 1 from pg_policies where tablename='albums' and cmd='DELETE')
                                                      as m0005_album_delete,
  exists (select 1 from information_schema.columns
          where table_name='photos' and column_name='focus_x')
                                                      as m0006_photo_focus,
  exists (select 1 from pg_policies where tablename='album_members' and cmd='DELETE')
                                                      as m0007_member_remove,
  exists (select 1 from information_schema.columns
          where table_name='bingo_boards' and column_name='cols')
                                                      as m0009_bingo_grid,
  -- Should be FALSE: the invite gate was removed in 0013.
  exists (select 1 from information_schema.columns
          where table_name='profiles' and column_name='approved')
                                                      as invite_gate_still_present;
