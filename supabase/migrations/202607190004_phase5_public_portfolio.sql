begin;

create table public.public_portfolios (
  user_id uuid primary key references auth.users(id) on delete cascade,
  slug text not null unique
    check (
      slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
      and char_length(slug) between 3 and 50
    ),
  display_name text not null check (char_length(display_name) between 2 and 80),
  headline text not null check (char_length(headline) between 3 and 200),
  bio text not null default '' check (char_length(bio) <= 800),
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.published_artifacts (
  artifact_id uuid primary key references public.portfolio_artifacts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  public_title text not null check (char_length(public_title) between 3 and 200),
  public_summary text not null check (char_length(public_summary) between 20 and 1200),
  artifact_type text not null,
  artifact_url text check (artifact_url is null or artifact_url ~* '^https://'),
  skill_tags text[] not null check (cardinality(skill_tags) > 0),
  quality_score integer not null check (quality_score between 0 and 100),
  featured boolean not null default false,
  display_order integer not null default 0 check (display_order between 0 and 10000),
  published_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index published_artifacts_user_order_idx
  on public.published_artifacts (
    user_id,
    featured desc,
    display_order,
    published_at,
    artifact_id
  );

alter table public.public_portfolios enable row level security;
alter table public.published_artifacts enable row level security;

create policy "published portfolios are public"
  on public.public_portfolios
  for select
  using (is_published or auth.uid() = user_id);

create policy "owners insert public portfolio"
  on public.public_portfolios
  for insert
  to authenticated
  with check (auth.uid() = user_id and is_published = false);

create policy "owners update public portfolio"
  on public.public_portfolios
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "published artifacts are public"
  on public.published_artifacts
  for select
  using (
    auth.uid() = user_id
    or exists (
      select 1
      from public.public_portfolios p
      where p.user_id = published_artifacts.user_id
        and p.is_published
    )
  );

grant select on public.public_portfolios, public.published_artifacts to anon, authenticated;
grant insert, update on public.public_portfolios to authenticated;
revoke insert, update, delete on public.published_artifacts from anon, authenticated;

create or replace function public.set_public_portfolio_updated_at()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger public_portfolios_set_updated_at
before update on public.public_portfolios
for each row execute function public.set_public_portfolio_updated_at();

create or replace function public.publish_portfolio_artifact(
  p_artifact_id uuid,
  p_public_title text,
  p_public_summary text,
  p_show_artifact_url boolean,
  p_featured boolean,
  p_display_order integer
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_user_id uuid := auth.uid();
  v_artifact public.portfolio_artifacts%rowtype;
  v_featured_count integer;
  v_artifact_url text;
begin
  if v_user_id is null then
    raise exception 'portfolio_auth_required';
  end if;

  if char_length(trim(p_public_title)) not between 3 and 200
    or char_length(trim(p_public_summary)) not between 20 and 1200
    or p_display_order not between 0 and 10000 then
    raise exception 'portfolio_public_fields_invalid';
  end if;

  select *
    into v_artifact
    from public.portfolio_artifacts
   where id = p_artifact_id
     and user_id = auth.uid();

  if not found then
    raise exception 'portfolio_artifact_not_found';
  end if;

  if v_artifact.verification_status <> 'verified' then
    raise exception 'portfolio_artifact_not_verified';
  end if;

  if p_show_artifact_url then
    if v_artifact.artifact_url is null
      or v_artifact.artifact_url !~* '^https://' then
      raise exception 'portfolio_artifact_url_not_https';
    end if;
    v_artifact_url := v_artifact.artifact_url;
  else
    v_artifact_url := null;
  end if;

  perform pg_advisory_xact_lock(hashtextextended(v_user_id::text, 0));

  if p_featured then
    select count(*)
      into v_featured_count
      from public.published_artifacts
     where user_id = v_user_id
       and featured
       and artifact_id <> p_artifact_id;

    if v_featured_count >= 3 then
      raise exception 'portfolio_featured_limit';
    end if;
  end if;

  insert into public.published_artifacts (
    artifact_id,
    user_id,
    public_title,
    public_summary,
    artifact_type,
    artifact_url,
    skill_tags,
    quality_score,
    featured,
    display_order
  ) values (
    v_artifact.id,
    v_user_id,
    trim(p_public_title),
    trim(p_public_summary),
    v_artifact.artifact_type,
    v_artifact_url,
    v_artifact.skill_tags,
    v_artifact.quality_score,
    p_featured,
    p_display_order
  )
  on conflict (artifact_id) do update
    set public_title = excluded.public_title,
        public_summary = excluded.public_summary,
        artifact_type = excluded.artifact_type,
        artifact_url = excluded.artifact_url,
        skill_tags = excluded.skill_tags,
        quality_score = excluded.quality_score,
        featured = excluded.featured,
        display_order = excluded.display_order,
        updated_at = now()
    where public.published_artifacts.user_id = v_user_id;
end;
$$;

create or replace function public.unpublish_portfolio_artifact(
  p_artifact_id uuid
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'portfolio_auth_required';
  end if;

  delete from public.published_artifacts
   where artifact_id = p_artifact_id
     and user_id = auth.uid();

  if not found then
    raise exception 'portfolio_artifact_not_found';
  end if;
end;
$$;

revoke all on function public.publish_portfolio_artifact(uuid, text, text, boolean, boolean, integer) from public;
revoke all on function public.publish_portfolio_artifact(uuid, text, text, boolean, boolean, integer) from anon;
grant execute on function public.publish_portfolio_artifact(uuid, text, text, boolean, boolean, integer) to authenticated;

revoke all on function public.unpublish_portfolio_artifact(uuid) from public;
revoke all on function public.unpublish_portfolio_artifact(uuid) from anon;
grant execute on function public.unpublish_portfolio_artifact(uuid) to authenticated;

commit;
