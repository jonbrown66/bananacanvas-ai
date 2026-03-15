create table if not exists public.client_performance_metrics (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  observed_at timestamptz not null default now(),
  metric_name text not null,
  metric_value double precision not null,
  unit text not null default 'ms',
  level text not null default 'info' check (level in ('info', 'warn', 'error')),
  tags jsonb not null default '{}'::jsonb
);

create index if not exists idx_client_perf_metrics_created_at
  on public.client_performance_metrics (created_at desc);

create index if not exists idx_client_perf_metrics_name_time
  on public.client_performance_metrics (metric_name, created_at desc);

create index if not exists idx_client_perf_metrics_tags_gin
  on public.client_performance_metrics using gin (tags);

alter table public.client_performance_metrics enable row level security;

revoke all on table public.client_performance_metrics from anon, authenticated;
grant select, insert on table public.client_performance_metrics to service_role;
