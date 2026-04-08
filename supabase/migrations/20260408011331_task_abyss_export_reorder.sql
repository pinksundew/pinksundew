create schema if not exists private;

alter table public.tasks
	add column if not exists is_deleted boolean default false,
	add column if not exists completed_at timestamp with time zone;

update public.tasks
set is_deleted = false
where is_deleted is null;

update public.tasks
set completed_at = coalesce(completed_at, updated_at, created_at)
where status = 'done'
	and completed_at is null;

alter table public.tasks alter column is_deleted set default false;
alter table public.tasks alter column is_deleted set not null;

with ranked_tasks as (
	select
		id,
		row_number() over (
			partition by project_id
			order by position, created_at, id
		) - 1 as next_position
	from public.tasks
)
update public.tasks as tasks
set position = ranked_tasks.next_position
from ranked_tasks
where tasks.id = ranked_tasks.id
	and tasks.position is distinct from ranked_tasks.next_position;

create or replace function private.is_project_member(p_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
	select exists (
		select 1
		from public.project_members
		where project_id = p_project_id
			and user_id = (select auth.uid())
	);
$function$;

grant usage on schema private to authenticated, service_role;
revoke execute on all functions in schema private from public;
revoke execute on all functions in schema private from anon;
revoke execute on all functions in schema private from authenticated;
grant execute on function private.is_project_member(uuid) to authenticated, service_role;

create or replace function public.reorder_project_tasks(p_project_id uuid, p_tasks jsonb)
returns integer
language plpgsql
set search_path to 'public'
as $function$
declare
	task_count integer;
	valid_count integer;
	project_task_count integer;
	updated_count integer;
begin
	if coalesce(jsonb_typeof(p_tasks), '') <> 'array' or jsonb_array_length(p_tasks) = 0 then
		raise exception 'tasks must be a non-empty array';
	end if;

	if not private.is_project_member(p_project_id) then
		raise exception 'Forbidden';
	end if;

	with payload as (
		select
			(item->>'id')::uuid as id,
			item->>'status' as status,
			(item->>'position')::integer as position
		from jsonb_array_elements(p_tasks) as item
	)
	select count(*) into task_count from payload;

	with payload as (
		select
			(item->>'id')::uuid as id,
			item->>'status' as status,
			(item->>'position')::integer as position
		from jsonb_array_elements(p_tasks) as item
	)
	select count(*) into valid_count
	from payload
	where status in ('todo', 'in-progress', 'done')
		and position is not null
		and position >= 0;

	if valid_count <> task_count then
		raise exception 'Invalid task payload';
	end if;

	with payload as (
		select (item->>'id')::uuid as id
		from jsonb_array_elements(p_tasks) as item
	)
	select count(distinct id) into valid_count from payload;

	if valid_count <> task_count then
		raise exception 'Duplicate task ids are not allowed';
	end if;

	with payload as (
		select (item->>'id')::uuid as id
		from jsonb_array_elements(p_tasks) as item
	)
	select count(*) into project_task_count
	from payload
	join public.tasks on tasks.id = payload.id
	where tasks.project_id = p_project_id;

	if project_task_count <> task_count then
		raise exception 'One or more tasks could not be validated for this project';
	end if;

	with payload as (
		select
			(item->>'id')::uuid as id,
			item->>'status' as status,
			(item->>'position')::integer as position
		from jsonb_array_elements(p_tasks) as item
	),
	updated as (
		update public.tasks as tasks
		set
			status = payload.status,
			position = payload.position,
			updated_at = now(),
			completed_at = case
				when payload.status = 'done' and tasks.status != 'done' then now()
				when payload.status != 'done' and tasks.status = 'done' then null
				else tasks.completed_at
			end
		from payload
		where tasks.id = payload.id
			and tasks.project_id = p_project_id
		returning tasks.id
	)
	select count(*) into updated_count from updated;

	if updated_count <> task_count then
		raise exception 'Task order update did not affect all rows';
	end if;

	return updated_count;
end;
$function$;

revoke execute on function public.reorder_project_tasks(uuid, jsonb) from public;
revoke execute on function public.reorder_project_tasks(uuid, jsonb) from anon;
grant execute on function public.reorder_project_tasks(uuid, jsonb) to authenticated, service_role;
