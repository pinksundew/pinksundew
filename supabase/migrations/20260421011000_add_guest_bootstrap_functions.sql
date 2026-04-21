create schema if not exists private;

grant usage on schema private to authenticated;

create or replace function private.bootstrap_guest_project()
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  guest_project_id uuid;
begin
  if current_user_id is null then
    raise exception 'Unauthorized';
  end if;

  select projects.id
  into guest_project_id
  from public.projects
  where projects.created_by = current_user_id
    and projects.is_guest = true
  order by projects.created_at desc nulls last
  limit 1;

  if guest_project_id is null then
    insert into public.projects (name, description, created_by, is_guest)
    values (
      'Guest Board',
      'Temporary workspace created before an account is claimed.',
      current_user_id,
      true
    )
    returning id into guest_project_id;
  end if;

  insert into public.project_members (project_id, user_id, role)
  select guest_project_id, current_user_id, 'owner'
  where not exists (
    select 1
    from public.project_members
    where project_members.project_id = guest_project_id
      and project_members.user_id = current_user_id
  );

  insert into public.project_agent_controls (project_id, allow_task_completion, tool_toggles, updated_by)
  select guest_project_id, true, '{}'::jsonb, current_user_id
  where not exists (
    select 1
    from public.project_agent_controls
    where project_agent_controls.project_id = guest_project_id
  );

  insert into public.agent_instruction_sets (
    project_id,
    name,
    code,
    scope,
    description,
    sort_order,
    is_active
  )
  select guest_project_id, 'Workspace Standard', 'workspace-standard', 'global', null, 0, true
  where not exists (
    select 1
    from public.agent_instruction_sets
    where agent_instruction_sets.project_id = guest_project_id
      and agent_instruction_sets.scope = 'global'
  );

  return guest_project_id;
end;
$$;

revoke all on function private.bootstrap_guest_project() from public, anon, authenticated;
grant execute on function private.bootstrap_guest_project() to authenticated;

create or replace function public.bootstrap_guest_project()
returns uuid
language sql
security invoker
set search_path = ''
as $$
  select private.bootstrap_guest_project();
$$;

revoke all on function public.bootstrap_guest_project() from public, anon;
grant execute on function public.bootstrap_guest_project() to authenticated;
