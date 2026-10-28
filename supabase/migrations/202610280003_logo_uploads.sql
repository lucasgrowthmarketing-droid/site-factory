begin;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('sitefactory-logos','sitefactory-logos',true,196608,array['image/webp','image/png'])
on conflict(id) do nothing;
create policy sitefactory_logo_insert on storage.objects for insert to authenticated
with check(bucket_id='sitefactory-logos' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy sitefactory_logo_select on storage.objects for select to authenticated
using(bucket_id='sitefactory-logos' and (storage.foldername(name))[1]=(select auth.uid())::text);
-- Public bucket serves logos by URL; listing and writes stay scoped to their owner.
-- Objects are immutable: replacing a logo creates a new URL, preserving existing previews.
commit;
