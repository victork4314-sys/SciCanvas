-- Expand the database-backed collaboration transport from position-only rows
-- to compact complete visual object-state rows.
-- Deployed to production as migration expand_object_motion_to_live_state.

alter table public.collaboration_object_motion
  add column if not exists object_state jsonb not null default '{}'::jsonb;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'collaboration_object_motion_state_size'
      and conrelid = 'public.collaboration_object_motion'::regclass
  ) then
    alter table public.collaboration_object_motion
      add constraint collaboration_object_motion_state_size
      check (octet_length(object_state::text) <= 65536) not valid;
    alter table public.collaboration_object_motion
      validate constraint collaboration_object_motion_state_size;
  end if;
end $$;

alter table public.collaboration_object_motion replica identity full;
