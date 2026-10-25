create table public.public_published_reviews as
select id,professional_id,rating,comment,created_at from public.reviews
where moderation_status='PUBLISHED' with no data;
alter table public.public_published_reviews add primary key(id);
alter table public.public_published_reviews enable row level security;
create policy "Public can read published reviews" on public.public_published_reviews
for select to anon,authenticated using (true);
revoke all on public.public_published_reviews from public,anon,authenticated;
grant select on public.public_published_reviews to anon,authenticated;
insert into public.public_published_reviews
select id,professional_id,rating,comment,created_at from public.reviews
where moderation_status='PUBLISHED';
create or replace function private.sync_public_published_review()
returns trigger language plpgsql security definer set search_path='' as $$
declare v_id uuid;
begin
 v_id := case when tg_op='DELETE' then old.id else new.id end;
 delete from public.public_published_reviews where id=v_id;
 if tg_op<>'DELETE' and new.moderation_status='PUBLISHED' then
  insert into public.public_published_reviews(id,professional_id,rating,comment,created_at)
  values(new.id,new.professional_id,new.rating,new.comment,new.created_at);
 end if;
 return null;
end $$;
revoke all on function private.sync_public_published_review() from public,anon,authenticated;
create trigger sync_published_review after insert or update or delete on public.reviews
for each row execute function private.sync_public_published_review();
create or replace function public.get_public_review_stats()
returns table(user_id uuid,review_count integer,average_rating numeric)
language sql stable security invoker set search_path='' as $$
 select professional_id as user_id,count(*)::integer,round(avg(rating),2)
 from public.public_published_reviews group by professional_id;
$$;
create or replace function public.get_public_reviews(p_professional_id uuid)
returns table(id uuid,rating integer,comment text,created_at timestamptz)
language sql stable security invoker set search_path='' as $$
 select id,rating,comment,created_at from public.public_published_reviews
 where professional_id=p_professional_id order by created_at desc;
$$;
grant execute on function public.get_public_review_stats() to anon,authenticated;
grant execute on function public.get_public_reviews(uuid) to anon,authenticated;
