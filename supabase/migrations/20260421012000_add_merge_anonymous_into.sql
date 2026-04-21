create or replace function private.merge_anonymous_into(
  p_anon_user_id uuid,
  p_target_user_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := auth.uid();
  anon_is_anonymous boolean;
  target_exists boolean;
  merged_projects int := 0;
  merged_api_keys int := 0;
  merged_setup_tokens int := 0;
  merged_activity int := 0;
  merged_memberships int := 0;
begin
  if caller_id is null then
    raise exception 'Unauthorized' using errcode = '28000';
  end if;

  if caller_id <> p_target_user_id then
    raise exception 'Caller is not the target user' using errcode = '28000';
  end if;

  if p_anon_user_id = p_target_user_id then
    return jsonb_build_object(
      'ok', true,
      'no_op', true,
      'reason', 'anon_and_target_match'
    );
  end if;

  select is_anonymous, true
    into anon_is_anonymous, target_exists
  from auth.users
  where id = p_anon_user_id;

  if target_exists is null then
    return jsonb_build_object(
      'ok', true,
      'no_op', true,
      'reason', 'anon_user_not_found'
    );
  end if;

  if coalesce(anon_is_anonymous, false) = false then
    raise exception 'Source user is not anonymous' using errcode = '42501';
  end if;

  select exists(select 1 from auth.users where id = p_target_user_id)
    into target_exists;
  if not target_exists then
    raise exception 'Target user does not exist' using errcode = '22023';
  end if;

  update public.projects
     set created_by = p_target_user_id,
         is_guest = false,
         updated_at = now()
   where created_by = p_anon_user_id;
  get diagnostics merged_projects = row_count;

  update public.project_members pm
     set user_id = p_target_user_id
   where pm.user_id = p_anon_user_id
     and not exists (
       select 1
       from public.project_members existing
       where existing.project_id = pm.project_id
         and existing.user_id = p_target_user_id
     );
  get diagnostics merged_memberships = row_count;

  delete from public.project_members
   where user_id = p_anon_user_id;

  update public.api_keys
     set user_id = p_target_user_id
   where user_id = p_anon_user_id;
  get diagnostics merged_api_keys = row_count;

  update public.cli_setup_tokens
     set user_id = p_target_user_id
   where user_id = p_anon_user_id;
  get diagnostics merged_setup_tokens = row_count;

  update public.project_mcp_activity pma
     set user_id = p_target_user_id
   where pma.user_id = p_anon_user_id
     and not exists (
       select 1
       from public.project_mcp_activity existing
       where existing.project_id = pma.project_id
         and existing.user_id = p_target_user_id
     );
  get diagnostics merged_activity = row_count;

  delete from public.project_mcp_activity
   where user_id = p_anon_user_id;

  update public.tasks
     set assignee_id = p_target_user_id
   where assignee_id = p_anon_user_id;

  update public.task_state_messages
     set created_by = p_target_user_id
   where created_by = p_anon_user_id;

  update public.task_plans
     set created_by = p_target_user_id
   where created_by = p_anon_user_id;

  update public.project_agent_controls
     set updated_by = p_target_user_id
   where updated_by = p_anon_user_id;

  delete from public.profiles where id = p_anon_user_id;
  delete from auth.users where id = p_anon_user_id;

  return jsonb_build_object(
    'ok', true,
    'merged_projects', merged_projects,
    'merged_memberships', merged_memberships,
    'merged_api_keys', merged_api_keys,
    'merged_setup_tokens', merged_setup_tokens,
    'merged_mcp_activity', merged_activity
  );
end;
$$;

revoke all on function private.merge_anonymous_into(uuid, uuid) from public, anon, authenticated;
grant execute on function private.merge_anonymous_into(uuid, uuid) to authenticated;

create or replace function public.merge_anonymous_into(
  p_anon_user_id uuid,
  p_target_user_id uuid
)
returns jsonb
language sql
security invoker
set search_path = ''
as $$
  select private.merge_anonymous_into(p_anon_user_id, p_target_user_id);
$$;

revoke all on function public.merge_anonymous_into(uuid, uuid) from public, anon;
grant execute on function public.merge_anonymous_into(uuid, uuid) to authenticated;
