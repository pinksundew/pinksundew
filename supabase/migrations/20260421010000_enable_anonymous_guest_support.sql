alter table public.profiles
  alter column email drop not null;

do $$
begin
  if (select is_nullable
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'profiles'
        and column_name = 'full_name') <> 'YES'
     or (select is_nullable
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'profiles'
        and column_name = 'avatar_url') <> 'YES'
  then
    raise exception 'profiles.full_name or profiles.avatar_url is NOT NULL; anonymous signup will fail';
  end if;
end
$$;

alter table public.projects
  add column if not exists is_guest boolean not null default false;

create index if not exists projects_is_guest_created_by_idx
  on public.projects (created_by)
  where is_guest = true;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$;

revoke all on function public.handle_new_user() from public, anon, authenticated;

create extension if not exists pg_cron with schema pg_catalog;

grant usage on schema cron to postgres;
grant all privileges on all tables in schema cron to postgres;
