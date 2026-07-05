create table if not exists public.coach_chat_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  thread_id text not null default 'default',
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  mode text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists coach_chat_messages_user_thread_created_idx
on public.coach_chat_messages (user_id, thread_id, created_at);

alter table public.coach_chat_messages enable row level security;
alter table public.coach_chat_messages force row level security;

grant select, insert, delete on public.coach_chat_messages to authenticated;

drop policy if exists "Users can manage own coach chat messages" on public.coach_chat_messages;
create policy "Users can manage own coach chat messages"
on public.coach_chat_messages
for all
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);
