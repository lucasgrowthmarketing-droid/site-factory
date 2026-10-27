-- SiteFactory / fase 1–3. Execute no Supabase SQL Editor ou com supabase db push.
begin;
create table public.templates (
 id text primary key, name text not null, category text not null,
 version integer not null default 1, created_at timestamptz not null default now()
);
insert into public.templates(id,name,category) values ('barber-premium','Barber Premium','Barbearia');
create table public.business_leads (
 id uuid primary key, owner_id uuid not null references auth.users(id) on delete cascade,
 data jsonb not null check(jsonb_typeof(data)='object'),
 name text generated always as (data->>'name') stored,
 category text generated always as (data->>'category') stored,
 city text generated always as (data->>'city') stored,
 phone text generated always as (regexp_replace(data->>'phone','[^0-9]','','g')) stored,
 stage text generated always as (data->>'stage') stored,
 verification text generated always as (data->>'verification') stored,
 source text generated always as (data->>'source') stored,
 external_id text generated always as (data->>'externalId') stored,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(id,owner_id), check(length(trim(data->>'name')) between 1 and 150),
 check(data->>'stage' in ('Novo lead','Em qualificação','Qualificado','Demonstração criada','Aguardando contato','Contatado','Respondeu','Proposta enviada','Cliente fechado','Perdido')),
 check(data->>'verification' in ('Possivelmente sem site','Sem site confirmado','Possui site','Necessita revisão'))
);
create index lead_owner_stage on public.business_leads(owner_id,stage);
create index lead_owner_city on public.business_leads(owner_id,city);
create unique index lead_external_unique on public.business_leads(owner_id,source,external_id) where external_id<>'';
create unique index lead_phone_unique on public.business_leads(owner_id,(case when length(phone)=13 and left(phone,2)='55' then substring(phone from 3) else phone end)) where length(phone)>=10;
create unique index lead_name_city_unique on public.business_leads(owner_id,lower(trim(name)),lower(trim(city))) where city<>'';
create table public.site_previews (
 id uuid primary key, owner_id uuid not null references auth.users(id) on delete cascade,
 lead_id uuid not null, token text not null unique check(token ~ '^[a-f0-9]{64}$'), active boolean not null default true,
 template_id text not null default 'barber-premium' references public.templates(id),
 config jsonb not null check(jsonb_typeof(config)='object'), data jsonb not null,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 foreign key(lead_id,owner_id) references public.business_leads(id,owner_id) on delete cascade,
 unique(lead_id), check(config->>'templateId'='barber-premium'),
 check(length(config->>'businessName') between 1 and 150)
);
create index preview_owner_created on public.site_previews(owner_id,created_at desc);
create table public.commercial_activities (
 id uuid primary key, owner_id uuid not null references auth.users(id) on delete cascade,
 lead_id uuid not null, data jsonb not null,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 foreign key(lead_id,owner_id) references public.business_leads(id,owner_id) on delete cascade
);
create index activity_lead_created on public.commercial_activities(lead_id,created_at desc);
create table public.lead_sources(id uuid primary key default gen_random_uuid(),owner_id uuid not null references auth.users(id) on delete cascade,name text not null,license_notes text,created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create table public.lead_import_jobs(id uuid primary key default gen_random_uuid(),owner_id uuid not null references auth.users(id) on delete cascade,source_id uuid references public.lead_sources(id),status text not null default 'pending',imported_count integer not null default 0,failed_count integer not null default 0,details jsonb not null default '{}',created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create table public.app_settings(owner_id uuid primary key references auth.users(id) on delete cascade,import_limit integer not null default 500 check(import_limit between 1 and 500),created_at timestamptz not null default now(),updated_at timestamptz not null default now());
-- No anonymous access to tables. Public capability returns only template configuration.
create function public.get_public_preview(access_token text) returns jsonb
language sql stable security definer set search_path='' as $$
 select config from public.site_previews where token=access_token and active=true limit 1;
$$;
revoke all on function public.get_public_preview(text) from public;
grant execute on function public.get_public_preview(text) to anon,authenticated;
alter table public.templates enable row level security;
create policy template_read on public.templates for select to authenticated using(true);
grant select on public.templates to authenticated;
create function public.touch_updated_at() returns trigger language plpgsql set search_path='' as $$begin new.updated_at=now();return new;end;$$;
do $$declare t text;begin
 foreach t in array array['business_leads','site_previews','commercial_activities','lead_sources','lead_import_jobs','app_settings'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('revoke all on public.%I from anon',t);
 execute format('grant select,insert,update,delete on public.%I to authenticated',t);
 execute format('create policy owner_isolation on public.%I for all to authenticated using ((select auth.uid())=owner_id) with check ((select auth.uid())=owner_id)',t);
 execute format('create trigger set_updated_at before update on public.%I for each row execute function public.touch_updated_at()',t);
 end loop;
end$$;
commit;
