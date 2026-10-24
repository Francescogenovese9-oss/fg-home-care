-- Thirty-day clinical-content retention, with separately controlled legal holds.
alter table public.appointments add column if not exists completed_at timestamptz;
update public.appointments
set completed_at = coalesce(updated_at, created_at)
where status = 'COMPLETED' and completed_at is null;

create or replace function private.set_appointment_completed_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.status = 'COMPLETED' and old.status is distinct from 'COMPLETED' then
    new.completed_at := now();
  end if;
  return new;
end;
$$;
revoke all on function private.set_appointment_completed_at() from public, anon, authenticated;
drop trigger if exists set_appointment_completed_at on public.appointments;
create trigger set_appointment_completed_at
before update of status on public.appointments
for each row execute function private.set_appointment_completed_at();

create table if not exists private.clinical_retention_holds (
  appointment_id uuid primary key references public.appointments(id) on delete cascade,
  reason text not null,
  created_at timestamptz not null default now()
);
revoke all on private.clinical_retention_holds from public, anon, authenticated;
alter table private.clinical_retention_holds enable row level security;

create or replace function private.purge_expired_appointment_clinical_content()
returns void language plpgsql security definer set search_path = '' as $$
begin
  delete from public.appointment_messages m
  using public.appointments a
  where m.appointment_id = a.id
    and a.status = 'COMPLETED'
    and a.completed_at < now() - interval '30 days'
    and not exists (select 1 from private.clinical_retention_holds h where h.appointment_id = a.id);

  delete from private.completed_appointment_notes n
  using public.appointments a
  where n.appointment_id = a.id
    and a.status = 'COMPLETED'
    and a.completed_at < now() - interval '30 days'
    and not exists (select 1 from private.clinical_retention_holds h where h.appointment_id = a.id);
end;
$$;
revoke all on function private.purge_expired_appointment_clinical_content() from public, anon, authenticated;

create extension if not exists pg_cron with schema pg_catalog;
select cron.schedule('fg-home-care-purge-clinical-content', '17 3 * * *',
  'select private.purge_expired_appointment_clinical_content()');
