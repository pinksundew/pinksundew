create table if not exists public.cli_setup_tokens (
  id uuid primary key default gen_random_uuid(),
  token_hash text not null unique,
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  client text not null check (client in ('cursor', 'codex', 'claude-code', 'antigravity', 'vscode')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  used_at timestamptz
);

alter table public.cli_setup_tokens enable row level security;

create index if not exists cli_setup_tokens_user_id_idx
  on public.cli_setup_tokens(user_id);

create index if not exists cli_setup_tokens_project_id_idx
  on public.cli_setup_tokens(project_id);

create index if not exists cli_setup_tokens_valid_exchange_idx
  on public.cli_setup_tokens(token_hash, client, project_id, expires_at)
  where used_at is null;
