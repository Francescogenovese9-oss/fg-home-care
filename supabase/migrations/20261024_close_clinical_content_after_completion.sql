-- Limit clinical notes and chat visibility to appointments not yet completed.
-- Archive notes privately when a professional marks a visit completed.
create table if not exists private.completed_appointment_notes (
  appointment_id uuid primary key references public.appointments(id) on delete cascade,
  patient_notes text,
  professional_notes text,
  archived_at timestamptz not null default now()
);
revoke all on private.completed_appointment_notes from public, anon, authenticated;
alter table private.completed_appointment_notes enable row level security;

create or replace function private.archive_notes_on_appointment_completion()
returns trigger language plpgsql security definer
set search_path = '' as $$
begin
  if old.status is distinct from 'COMPLETED' and new.status = 'COMPLETED' then
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
drop trigger if exists archive_notes_on_appointment_completion on public.appointments;
create trigger archive_notes_on_appointment_completion
before update of status on public.appointments
for each row execute function private.archive_notes_on_appointment_completion();

-- Protect notes of appointments that were already completed before this migration.
insert into private.completed_appointment_notes
  (appointment_id, patient_notes, professional_notes)
select id, patient_notes, professional_notes
from public.appointments
where status = 'COMPLETED' and (patient_notes is not null or professional_notes is not null)
on conflict (appointment_id) do nothing;
update public.appointments
set patient_notes = null, professional_notes = null
where status = 'COMPLETED' and (patient_notes is not null or professional_notes is not null);

-- Existing chat policies are restricted by appointment state, including direct REST access.
drop policy if exists "Participants read appointment messages" on public.appointment_messages;
create policy "Participants read appointment messages"
on public.appointment_messages for select to authenticated
using (
  (select private.is_appointment_participant(appointment_id))
  and exists (
    select 1 from public.appointments a
    where a.id = appointment_id and a.status in ('PENDING','ACCEPTED')
  )
);
drop policy if exists "Participants send appointment messages" on public.appointment_messages;
create policy "Participants send appointment messages"
on public.appointment_messages for insert to authenticated
with check (
  sender_id = (select auth.uid()) and read = false and read_at is null
  and char_length(btrim(message)) between 1 and 2000
  and exists (
    select 1 from public.appointments a
    where a.id = appointment_id
      and (a.patient_id = (select auth.uid()) or a.professional_id = (select auth.uid()))
      and a.status in ('PENDING','ACCEPTED')
  )
);
drop policy if exists "Participants mark received messages as read" on public.appointment_messages;
create policy "Participants mark received messages as read"
on public.appointment_messages for update to authenticated
using (
  sender_id <> (select auth.uid())
  and (select private.is_appointment_participant(appointment_id))
  and exists (select 1 from public.appointments a where a.id = appointment_id and a.status in ('PENDING','ACCEPTED'))
)
with check (
  sender_id <> (select auth.uid()) and read = true
  and (select private.is_appointment_participant(appointment_id))
  and exists (select 1 from public.appointments a where a.id = appointment_id and a.status in ('PENDING','ACCEPTED'))
);
