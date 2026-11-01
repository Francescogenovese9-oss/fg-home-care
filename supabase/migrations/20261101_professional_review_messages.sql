create table if not exists public.professional_review_messages (
 id uuid primary key default gen_random_uuid(),
 professional_id uuid not null references auth.users(id) on delete cascade,
 sender_id uuid not null references auth.users(id),
 body text not null check (char_length(btrim(body)) between 1 and 2000),
 created_at timestamptz not null default now(),
 read_at timestamptz
);
create index if not exists professional_review_messages_thread_idx on public.professional_review_messages(professional_id,created_at);
alter table public.professional_review_messages enable row level security;
create policy "Review messages visible to owner or admin" on public.professional_review_messages for select to authenticated using (
 professional_id=(select auth.uid()) or exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='ADMIN')
);
create policy "Review messages insert by pending professional or admin" on public.professional_review_messages for insert to authenticated with check (
 sender_id=(select auth.uid()) and exists(select 1 from public.professional_profiles pp where pp.user_id=professional_id and pp.verification_status='PENDING')
 and (professional_id=(select auth.uid()) or exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='ADMIN'))
);
grant select,insert on public.professional_review_messages to authenticated;
