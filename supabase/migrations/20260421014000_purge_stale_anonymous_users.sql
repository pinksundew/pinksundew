create or replace function private.purge_stale_anonymous_users(
  p_older_than interval default interval '30 days',
  p_limit int default 500
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  stale_ids uuid[];
  projects_deleted int := 0;
  users_deleted int := 0;
begin
  select coalesce(array_agg(u.id), '{}')
    into stale_ids
  from auth.users u
  where u.is_anonymous = true
    and coalesce(u.last_sign_in_at, u.updated_at, u.created_at) < now() - p_older_than
  limit p_limit;

  if stale_ids is null or array_length(stale_ids, 1) is null then
    return jsonb_build_object(
      'ok', true,
      'stale_candidates', 0,
      'projects_deleted', 0,
      'users_deleted', 0
    );
  end if;

  delete from public.projects
   where created_by = any(stale_ids)
      or (is_guest = true and created_by is null);
  get diagnostics projects_deleted = row_count;

  delete from auth.users
   where id = any(stale_ids);
  get diagnostics users_deleted = row_count;

  return jsonb_build_object(
    'ok', true,
    'stale_candidates', array_length(stale_ids, 1),
    'projects_deleted', projects_deleted,
    'users_deleted', users_deleted
  );
end;
$$;

revoke all on function private.purge_stale_anonymous_users(interval, int) from public, anon, authenticated;

create or replace function private.run_purge_stale_anonymous_users()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  result jsonb;
begin
  result := private.purge_stale_anonymous_users();
  raise notice 'purge_stale_anonymous_users: %', result::text;
end;
$$;

revoke all on function private.run_purge_stale_anonymous_users() from public, anon, authenticated;

do $$
begin
  if exists (
    select 1 from cron.job where jobname = 'purge-stale-anonymous-users'
  ) then
    perform cron.unschedule('purge-stale-anonymous-users');
  end if;
end
$$;

select cron.schedule(
  'purge-stale-anonymous-users',
  '17 3 * * *',
  $cron$ select private.run_purge_stale_anonymous_users(); $cron$
);
