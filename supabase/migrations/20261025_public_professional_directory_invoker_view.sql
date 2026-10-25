-- Publish only approved professionals through a dedicated RLS-protected read model.
create table public.public_professional_directory as
select * from public.public_professionals with no data;
alter table public.public_professional_directory add primary key (user_id);
alter table public.public_professional_directory enable row level security;
create policy "Public can read directory" on public.public_professional_directory
for select to anon,authenticated using (true);
revoke all on public.public_professional_directory from public,anon,authenticated;
grant select on public.public_professional_directory to anon,authenticated;
insert into public.public_professional_directory select * from public.public_professionals;
create or replace function private.sync_public_professional_directory()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
 v_id := case when tg_op='DELETE' then old.user_id else new.user_id end;
 if tg_table_name='profiles' then
  v_id := case when tg_op='DELETE' then old.id else new.id end;
 end if;
 delete from public.public_professional_directory where user_id=v_id;
 if tg_op <> 'DELETE' then
  insert into public.public_professional_directory
  select pp.user_id,p.first_name,p.last_name,pp.profession,pp.specialization,
   pp.bio,pp.city,pp.province,pp.postal_code,pp.service_radius_km,
   pp.hourly_rate,pp.available_weekdays,pp.available_from,pp.available_to,
   pp.home_visits,pp.video_consultations,pp.avatar_path,pp.verification_status,
   pp.published,pp.created_at,pp.updated_at,pp.subscription_plan
  from public.professional_profiles pp
  join public.profiles p on p.id=pp.user_id
  where pp.user_id=v_id and p.role='PROFESSIONAL'::public.user_role
   and pp.verification_status='APPROVED' and pp.published=true;
 end if;
 return null;
end $$;
revoke all on function private.sync_public_professional_directory() from public,anon,authenticated;
create trigger sync_directory_professional after insert or update or delete
on public.professional_profiles for each row
execute function private.sync_public_professional_directory();
create trigger sync_directory_profile after update or delete
on public.profiles for each row
execute function private.sync_public_professional_directory();
create or replace view public.public_professionals with (security_invoker=true)
as select * from public.public_professional_directory;
grant select on public.public_professionals to anon,authenticated;
