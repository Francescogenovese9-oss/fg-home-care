create table public.professional_busy_intervals as
select professional_id,unavailable_date,all_day,start_time,end_time
from public.professional_unavailability with no data;
alter table public.professional_busy_intervals enable row level security;
create policy "Authenticated users can check busy intervals" on public.professional_busy_intervals
for select to authenticated using (true);
revoke all on public.professional_busy_intervals from public,anon,authenticated;
grant select on public.professional_busy_intervals to authenticated;
insert into public.professional_busy_intervals
select professional_id,unavailable_date,all_day,start_time,end_time from public.professional_unavailability;
create or replace function private.sync_professional_busy_intervals()
returns trigger language plpgsql security definer set search_path='' as $$
declare v_id uuid;
begin
 v_id := case when tg_op='DELETE' then old.professional_id else new.professional_id end;
 delete from public.professional_busy_intervals where professional_id=v_id;
 insert into public.professional_busy_intervals(professional_id,unavailable_date,all_day,start_time,end_time)
 select professional_id,unavailable_date,all_day,start_time,end_time
 from public.professional_unavailability where professional_id=v_id;
 return null;
end $$;
revoke all on function private.sync_professional_busy_intervals() from public,anon,authenticated;
create trigger sync_busy_intervals after insert or update or delete
on public.professional_unavailability for each row
execute function private.sync_professional_busy_intervals();
create or replace function public.is_professional_available(
p_professional_id uuid,p_appointment_date date,
p_appointment_time time without time zone,p_duration_minutes integer)
returns boolean language sql stable security invoker set search_path='' as $$
select not exists(
 select 1 from public.professional_busy_intervals pu
 where pu.professional_id=p_professional_id
 and pu.unavailable_date=p_appointment_date
 and (pu.all_day=true or (pu.all_day=false and pu.start_time is not null
 and pu.end_time is not null and p_appointment_time<pu.end_time
 and (p_appointment_time+make_interval(mins=>p_duration_minutes))>pu.start_time))
);
$$;
revoke execute on function public.is_professional_available(uuid,date,time without time zone,integer) from public,anon;
grant execute on function public.is_professional_available(uuid,date,time without time zone,integer) to authenticated;
