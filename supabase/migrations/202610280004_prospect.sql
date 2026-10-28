begin;
create or replace function public.process_prospect_batch(job_id uuid,expected_offset integer,lead_data jsonb,preview_data jsonb,next_offset integer,is_done boolean,run_cost numeric) returns void language plpgsql security invoker set search_path='' as $$
declare j public.lead_import_jobs; item jsonb; p jsonb; inserted_id uuid; added integer:=0; generated integer:=0;
begin
 select * into j from public.lead_import_jobs where id=job_id and owner_id=auth.uid() and request_key like 'prospect:%' for update;
 if not found then raise exception 'Invalid job';end if;
 if j.status='completed' or coalesce((j.details->>'offset')::integer,0)<>expected_offset then return;end if;
 if jsonb_array_length(lead_data)>25 then raise exception 'Batch too large';end if;
 for item in select * from jsonb_array_elements(lead_data) loop
 inserted_id:=null;
 insert into public.business_leads(id,owner_id,data) values((item->>'id')::uuid,auth.uid(),item) on conflict do nothing returning id into inserted_id;
 if inserted_id is not null then
 added:=added+1;
 select value into p from jsonb_array_elements(preview_data) where value->>'leadId'=item->>'id' limit 1;
 if p is not null and item->>'stage'='Qualificado' and coalesce(item->>'website','')='' then
 perform public.create_site_preview(p,jsonb_set(item,'{stage}','"Demonstração criada"'));
 generated:=generated+1;
 end if;
 end if;
 end loop;
 update public.lead_import_jobs set status=case when is_done then 'completed' else 'processing' end,imported_count=imported_count+added,details=details||jsonb_build_object('offset',next_offset,'generated',coalesce((details->>'generated')::integer,0)+generated,'costUsd',run_cost) where id=job_id;
end;$$;
revoke all on function public.process_prospect_batch(uuid,integer,jsonb,jsonb,integer,boolean,numeric) from public;
grant execute on function public.process_prospect_batch(uuid,integer,jsonb,jsonb,integer,boolean,numeric) to authenticated;
commit;
