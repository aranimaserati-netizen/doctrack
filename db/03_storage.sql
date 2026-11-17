-- Private bucket, PDF only, 25 MB limit
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('documents', 'documents', false, 26214400, array['application/pdf'])
on conflict (id) do nothing;

-- Path convention: {customer_org_id}/{document_id}/v{n}_{name}.pdf
-- The FIRST folder is the org id, which the policies check.

create policy "business uploads files" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'documents' and public.is_business());

create policy "read files of own org or business" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'documents'
    and (
      public.is_business()
      or (storage.foldername(name))[1] = public.my_org_id()::text
    )
  );

-- No update or delete policies = files are immutable (no overwrites, no deletes)