create or replace function private.enforce_anonymous_task_cap()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  is_guest_project boolean;
  active_count int;
  cap int := 10;
begin
  if new.is_deleted is true or new.status = 'done' then
    return new;
  end if;

  select projects.is_guest into is_guest_project
  from public.projects
  where projects.id = new.project_id;

  if is_guest_project is not true then
    return new;
  end if;

  select count(*) into active_count
  from public.tasks
  where tasks.project_id = new.project_id
    and coalesce(tasks.is_deleted, false) = false
    and coalesce(tasks.status, 'todo') <> 'done'
    and tasks.id <> new.id;

  if active_count >= cap then
    raise exception 'Anonymous boards are limited to % active tasks. Claim your account to add more tasks.', cap
      using errcode = 'P0002';
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_anonymous_task_cap_insert on public.tasks;
create trigger enforce_anonymous_task_cap_insert
  before insert on public.tasks
  for each row
  execute function private.enforce_anonymous_task_cap();

drop trigger if exists enforce_anonymous_task_cap_update on public.tasks;
create trigger enforce_anonymous_task_cap_update
  before update on public.tasks
  for each row
  when (
    (old.status is distinct from new.status)
    or (old.is_deleted is distinct from new.is_deleted)
    or (old.project_id is distinct from new.project_id)
  )
  execute function private.enforce_anonymous_task_cap();
