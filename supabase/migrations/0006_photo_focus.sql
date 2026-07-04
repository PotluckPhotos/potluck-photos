-- Per-photo focal point (percent from top-left, 0-100). When a photo is
-- cover-cropped to a frame — gallery tile, book page, recap — this point is
-- kept in view so the subject/face doesn't get cut off. Default 50/50 = center.
alter table public.photos
  add column focus_x smallint not null default 50,
  add column focus_y smallint not null default 50;
