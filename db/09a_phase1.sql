-- Category for each document (existing documents become "sales")
do $$ begin
  create type public.doc_category as enum ('sales', 'after_sales');
exception when duplicate_object then null; end $$;

alter table public.documents
  add column if not exists category public.doc_category not null default 'sales';

-- New create_document with a category (different arguments, so the old one keeps working)
create or replace function public.create_document(
  p_doc_id uuid, p_org_id uuid, p_title text, p_category public.doc_category,
  p_file_path text, p_file_name text
) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_version_id uuid := gen_random_uuid();
begin
  if not public.is_business() then raise exception 'Only business users can create documents'; end if;
  if length(trim(p_title)) not between 1 and 200 then raise exception 'Title must be 1-200 characters'; end if;
  if not exists (select 1 from public.customer_orgs where id = p_org_id) then
    raise exception 'Dealer not found';
  end if;
  if not starts_with(p_file_path, p_org_id::text || '/' || p_doc_id::text || '/v1_') then
    raise exception 'File path does not match the document';
  end if;
  if not exists (select 1 from storage.objects where bucket_id = 'documents' and name = p_file_path) then
    raise exception 'Uploaded file not found in storage';
  end if;

  insert into public.documents (id, customer_org_id, title, status, category, created_by)
  values (p_doc_id, p_org_id, trim(p_title), 'uploaded', p_category, auth.uid());

  insert into public.document_versions
    (id, document_id, version_number, file_path, file_name, note, uploaded_by)
  values (v_version_id, p_doc_id, 1, p_file_path, p_file_name, 'Original upload', auth.uid());

  update public.documents set current_version_id = v_version_id, updated_at = now()
  where id = p_doc_id;
  return p_doc_id;
end $$;

-- Dealer approves (replaces "approve / request changes")
create or replace function public.customer_approve(p_doc_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare d public.documents%rowtype;
begin
  select * into d from public.documents where id = p_doc_id for update;
  if not found or not coalesce(d.customer_org_id = public.my_org_id(), false) then
    raise exception 'Not allowed or not found';
  end if;
  if d.status = 'final' then raise exception 'Document is final and locked'; end if;
  if d.status not in ('uploaded', 'in_review', 'revised') then
    raise exception 'Cannot approve a document in status %', d.status;
  end if;
  perform public._set_status(p_doc_id, 'approved', auth.uid());
end $$;

revoke execute on function
  public.create_document(uuid, uuid, text, public.doc_category, text, text),
  public.customer_approve(uuid)
from public, anon;
grant execute on function
  public.create_document(uuid, uuid, text, public.doc_category, text, text),
  public.customer_approve(uuid)
to authenticated;