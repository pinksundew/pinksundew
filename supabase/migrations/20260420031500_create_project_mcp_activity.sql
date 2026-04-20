create table if not exists public.project_mcp_activity (
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  last_seen_at timestamptz not null default now(),
  last_request_path text,
  created_at timestamptz not null default now(),
  primary key (project_id, user_id)
);

alter table public.project_mcp_activity enable row level security;

create index if not exists project_mcp_activity_user_seen_idx
  on public.project_mcp_activity(user_id, last_seen_at desc);
