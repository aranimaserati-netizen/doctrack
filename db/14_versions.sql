create or replace function public.upload_version(
  p_doc_id uuid, p_file_path text, p_file_name text, p_note text default null
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  d public.documents%rowtype;
  v_next int;
  v_id uuid := gen_random_uuid();
begin
  if not public.is_business() then raise exception 'Only business users can upload versions'; end if;
  select * into d from public.documents where id = p_doc_id for update;
  if not found then raise exception 'Document not found'; end if;
  if d.status = 'final' then raise exception 'Document is final and locked'; end if;

  select coalesce(max(version_number), 0) + 1 into v_next
  from public.document_versions where document_id = p_doc_id;

  if not starts_with(p_file_path, d.customer_org_id::text || '/' || p_doc_id::text || '/v' || v_next || '_') then
    raise exception 'Version number changed. Refresh the page and try again';
  end if;
  if not exists (select 1 from storage.objects where bucket_id = 'documents' and name = p_file_path) then
    raise exception 'Uploaded file not found in storage';
  end if;

  insert into public.document_versions
    (id, document_id, version_number, file_path, file_name, note, uploaded_by)
  values (v_id, p_doc_id, v_next, p_file_path, p_file_name, nullif(trim(p_note), ''), auth.uid());

  update public.documents set current_version_id = v_id, updated_at = now() where id = p_doc_id;
  perform public._set_status(p_doc_id, 'revised', auth.uid());
  return v_id;
end $$;

revoke execute on function public.upload_version(uuid, text, text, text) from public, anon;
grant execute on function public.upload_version(uuid, text, text, text) to authenticated;