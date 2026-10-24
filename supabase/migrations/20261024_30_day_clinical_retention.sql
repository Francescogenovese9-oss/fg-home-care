-- Retain appointment chat and clinical notes for no longer than 30 days
-- after the professional marks the appointment COMPLETED, except legal holds.
create extension if not exists pg_cron with schema pg_catalog;

alter table public.appointments
  add column if not exists completed_at timestamptz;

alter table private.completed_appointment_notes
  add column if not exists retention_hold boolean not null default false;

-- Track the real completion event, not the appointment's scheduled end.
create or replace function private.archive_notes_on_appointment_completion()
returns trigger language plpgsql security definer
set search_path = '' as $$
begin
  if old.status is distinct from 'COMPLETED' and new.status = 'COMPLETED' then
    new.completed_at := now();
    insert into private.completed_appointment_notes
      (appointment_id, patient_notes, professional_notes)
    values (new.id, new.patient_notes, new.professional_notes)
    on conflict (appointment_id) do nothing;
    new.patient_notes := null;
    new.professional_notes := null;
  end if;
  return new;
end;
$$;
revoke all on function private.archive_notes_on_appointment_completion() from public, anon, authenticated;

-- No historical completed_at can be reconstructed reliably for old records.
-- Do not backdate them using the appointment date.
create table if not exists private.appointment_retention_holds (
  appointment_id uuid primary key references public.appointments(id) on delete cascade,
  reason text not null,
  created_at timestamptz not null default now()
);
revoke all on private.appointment_retention_holds from public, anon, authenticated;
alter table private.appointment_retention_holds enable row level security;

create or replace function private.purge_completed_appointment_clinical_data()
returns void language plpgsql security definer
set search_path = '' as $$
begin
  delete from public.appointment_messages m
  using public.appointments a
  where m.appointment_id = a.id
    and a.status = 'COMPLETED'
    and a.completed_at <= now() - interval '30 days'
    and not exists (
      select 1 from private.appointment_retention_holds h
      where h.appointment_id = a.id
    );

  delete from private.completed_appointment_notes n
  using public.appointments a
  where n.appointment_id = a.id
    and a.status = 'COMPLETED'
    and a.completed_at <= now() - interval '30 days'
    and n.retention_hold = false
    and not exists (
      select 1 from private.appointment_retention_holds h
      where h.appointment_id = a.id
    );
end;
$$;
revoke all on function private.purge_completed_appointment_clinical_data() from public, anon, authenticated;

select cron.schedule(
  'fg-home-care-purge-clinical-data-30d',
  '15 3 * * *',
  'select private.purge_completed_appointment_clinical_data()'
);
