begin;

alter table public.quest_assignments
  add column if not exists generation_key text;

create unique index if not exists quest_assignments_user_generation_uidx
  on public.quest_assignments (user_id, generation_key)
  where generation_key is not null;

commit;
