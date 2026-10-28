begin;
insert into public.templates(id,name,category) values('mechanic-pro','Mechanic Pro','Oficina mecânica') on conflict(id) do nothing;
do $$declare c record;begin
for c in select conname from pg_constraint where conrelid='public.site_previews'::regclass and contype='c' and pg_get_constraintdef(oid) like '%templateId%' loop execute format('alter table public.site_previews drop constraint %I',c.conname);end loop;
end$$;
alter table public.site_previews add constraint preview_template_supported check(config->>'templateId' in ('barber-premium','mechanic-pro'));
create or replace function public.sync_preview_template() returns trigger language plpgsql set search_path='' as $$begin new.template_id:=new.config->>'templateId';return new;end;$$;
create trigger sync_template_id before insert or update on public.site_previews for each row execute function public.sync_preview_template();
commit;
