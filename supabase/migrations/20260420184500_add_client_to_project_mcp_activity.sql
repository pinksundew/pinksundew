alter table public.project_mcp_activity
  add column if not exists client text;

update public.project_mcp_activity
set client = 'unknown'
where client is null;

alter table public.project_mcp_activity
  alter column client set default 'unknown',
  alter column client set not null;

alter table public.project_mcp_activity
  drop constraint if exists project_mcp_activity_pkey;

alter table public.project_mcp_activity
  add constraint project_mcp_activity_pkey primary key (project_id, user_id, client);

create index if not exists project_mcp_activity_project_user_seen_idx
  on public.project_mcp_activity(project_id, user_id, last_seen_at desc);

create index if not exists project_mcp_activity_user_client_seen_idx
  on public.project_mcp_activity(user_id, client, last_seen_at desc);
