begin;
alter table public.lead_import_jobs add column request_key text;
create unique index import_request_unique on public.lead_import_jobs(owner_id,request_key) where request_key is not null;
create table public.preview_events(id uuid primary key,preview_id uuid not null references public.site_previews(id) on delete cascade,created_at timestamptz not null default now());
create index preview_event_date on public.preview_events(preview_id,created_at);
alter table public.preview_events enable row level security;
revoke all on public.preview_events from anon;
grant select on public.preview_events to authenticated;
create policy event_owner_read on public.preview_events for select to authenticated using(exists(select 1 from public.site_previews p where p.id=preview_id and p.owner_id=(select auth.uid())));
create function public.record_preview_view(access_token text,event_id uuid) returns void language sql security definer set search_path='' as $$
 insert into public.preview_events(id,preview_id) select event_id,id from public.site_previews where token=access_token and active=true on conflict(id) do nothing;
$$;
revoke all on function public.record_preview_view(text,uuid) from public;
grant execute on function public.record_preview_view(text,uuid) to anon,authenticated;
create function public.preview_view_counts() returns table(preview_id uuid,views bigint) language sql security invoker set search_path='' as $$ select preview_id,count(*) from public.preview_events group by preview_id; $$;
revoke all on function public.preview_view_counts() from public;
grant execute on function public.preview_view_counts() to authenticated;
create function public.import_lead_batch(job_id uuid,lead_data jsonb,summary jsonb) returns void language plpgsql security invoker set search_path='' as $$
declare item jsonb;
begin
 if auth.uid() is null then raise exception 'Authentication required';end if;
 perform 1 from public.lead_import_jobs where id=job_id and owner_id=auth.uid() and status='running' for update;
 if not found then raise exception 'Invalid import job';end if;
 if jsonb_array_length(lead_data)>coalesce((select import_limit from public.app_settings where owner_id=auth.uid()),500) then raise exception 'Import limit exceeded';end if;
 for item in select * from jsonb_array_elements(lead_data) loop
 insert into public.business_leads(id,owner_id,data) values((item->>'id')::uuid,auth.uid(),item);
 end loop;
 update public.lead_import_jobs set status='completed',imported_count=jsonb_array_length(lead_data),failed_count=coalesce((summary->>'invalid')::integer,0),details=summary where id=job_id;
end;$$;
revoke all on function public.import_lead_batch(uuid,jsonb,jsonb) from public;
grant execute on function public.import_lead_batch(uuid,jsonb,jsonb) to authenticated;
commit;
