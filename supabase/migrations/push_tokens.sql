-- push_tokens テーブル: APNs / FCM デバイストークンを保存
create table if not exists public.push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  token text not null unique,
  platform text not null check (platform in ('ios', 'android')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.push_tokens enable row level security;

-- ユーザー自身のトークンのみ操作可能
create policy "Users can manage own tokens" on public.push_tokens
  for all using (auth.uid() = user_id);

-- updated_at 自動更新
create or replace function public.update_push_tokens_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger push_tokens_updated_at
  before update on public.push_tokens
  for each row execute function public.update_push_tokens_updated_at();
