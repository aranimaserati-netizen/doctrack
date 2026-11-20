-- =====================================================================
-- 0. Schema addition: remember which version a restore came from
-- =====================================================================
alter table public.document_versions
  add column if not exists restored_from_version_id uuid
  references public.document_versions(id);

-- =====================================================================
-- 1. Internal helper: change status AND log the event (client can't call it)
-- =====================================================================
create or replace function public._set_status(
  p_doc uuid,
  p_new public.doc_status,
  p_actor uuid,
  p_meta jsonb default '{}'::jsonb
) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_old public.doc_status;
  v_ver uuid;
begin
  select status, current_version_id into v_old, v_ver
  from public.documents where id = p_doc for update;

  if v_old = p_new then return; end if;

  update public.documents set status = p_new, updated_at = now() where id = p_doc;

  insert into public.events (document_id, version_id, type, actor_id, metadata)
  values (p_doc, v_ver, 'status_changed', p_actor,
          jsonb_build_object('from', v_old, 'to', p_new) || p_meta);
end $$;

revoke execute on function public._set_status(uuid, public.doc_status, uuid, jsonb)
  from public, anon, authenticated;

-- =====================================================================
-- 2. Final documents are locked at the database level
-- =====================================================================
create or replace function public.trg_lock_final()
returns trigger language plpgsql as $$
begin
  if old.status = 'final' then
    raise exception 'Final documents are locked';
  end if;
  return new;
end $$;

drop trigger if exists lock_final_documents on public.documents;
create trigger lock_final_documents
  before update on public.documents
  for each row execute function public.trg_lock_final();

-- =====================================================================
-- 3. Triggers: distinguish restores; customer's first comment => in_review
-- =====================================================================
create or replace function public.trg_version_uploaded()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.events (document_id, version_id, type, actor_id, metadata)
  values (
    new.document_id, new.id,
    case when new.restored_from_version_id is null
         then 'version_uploaded' else 'version_restored' end,
    new.uploaded_by,
    jsonb_build_object(
      'version_number', new.version_number,
      'file_name', new.file_name,
      'note', new.note,
      'restored_from_version_id', new.restored_from_version_id
    )
  );
  return new;
end $$;

create or replace function public.trg_comment_added()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_role public.user_role;
  v_status public.doc_status;
begin
  insert into public.events (document_id, version_id, type, actor_id, metadata)
  values (
    new.document_id, new.version_id,
    case when new.parent_id is null then 'comment_added' else 'reply_added' end,
    new.author_id,
    jsonb_build_object(
      'comment_id', new.id,
      'page_number', new.page_number,
      'excerpt', left(new.body, 140)
    )
  );

  if new.parent_id is null then
    select role into v_role from public.profiles where id = new.author_id;
    select status into v_status from public.documents where id = new.document_id;
    if v_role = 'customer' and v_status in ('uploaded', 'revised') then
      perform public._set_status(new.document_id, 'in_review', new.author_id);
    end if;
  end if;

  return new;
end $$;

-- =====================================================================
-- 4. Comment rules: only on the CURRENT version, replies must stay in thread
-- =====================================================================
drop policy if exists "comment on visible, non-final documents" on public.comments;
drop policy if exists "comment on current version of visible, non-final documents" on public.comments;

create policy "comment on current version of visible, non-final documents"
  on public.comments
  for insert to authenticated
  with check (
    author_id = auth.uid()
    and exists (
      select 1 from public.documents d
      where d.id = comments.document_id
        and d.status <> 'final'
        and d.current_version_id = comments.version_id
    )
    and (
      parent_id is null
      or exists (
        select 1 from public.comments p
        where p.id = comments.parent_id
          and p.document_id = comments.document_id
          and p.parent_id is null
      )
    )
  );

-- =====================================================================
-- 5. create_document: now SECURITY DEFINER (we are about to remove the
--    direct insert/update rights it relied on). Checks are unchanged.
-- =====================================================================
create or replace function public.create_document(
  p_doc_id uuid, p_org_id uuid, p_title text,
  p_file_path text, p_file_name text, p_note text
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_version_id uuid := gen_random_uuid();
begin
  if not public.is_business() then
    raise exception 'Only business users can create documents';
  end if;

  if not starts_with(p_file_path, p_org_id::text || '/' || p_doc_id::text || '/v1_') then
    raise exception 'File path does not match the document';
  end if;

  if not exists (select 1 from storage.objects
                 where bucket_id = 'documents' and name = p_file_path) then
    raise exception 'Uploaded file not found in storage';
  end if;

  insert into public.documents (id, customer_org_id, title, status, created_by)
  values (p_doc_id, p_org_id, p_title, 'uploaded', auth.uid());

  insert into public.document_versions
    (id, document_id, version_number, file_path, file_name, note, uploaded_by)
  values (v_version_id, p_doc_id, 1, p_file_path, p_file_name, p_note, auth.uid());

  update public.documents
  set current_version_id = v_version_id, updated_at = now()
  where id = p_doc_id;

  return p_doc_id;
end $$;

-- =====================================================================
-- 6. Remove direct write paths. From now on, writes go through functions.
-- =====================================================================
drop policy if exists "business updates documents" on public.documents;
drop policy if exists "business creates documents" on public.documents;
drop policy if exists "business uploads versions" on public.document_versions;

revoke insert, update on public.documents from authenticated;
revoke insert on public.document_versions from authenticated;
revoke update on public.comments from authenticated;

-- =====================================================================
-- 7. Resolve / reopen a comment (business or the document's customer)
-- =====================================================================
create or replace function public.set_comment_resolved(p_comment_id uuid, p_resolved boolean)
returns void
language plpgsql security definer set search_path = public as $$
declare
  c public.comments%rowtype;
  d public.documents%rowtype;
begin
  select * into c from public.comments where id = p_comment_id;
  if found then
    select * into d from public.documents where id = c.document_id;
  end if;

  if not found
     or not (public.is_business()
             or coalesce(d.customer_org_id = public.my_org_id(), false)) then
    raise exception 'Not allowed or not found';
  end if;

  if d.status = 'final' then raise exception 'Document is final and locked'; end if;
  if c.parent_id is not null then raise exception 'Only top-level comments can be resolved'; end if;
  if c.resolved = p_resolved then return; end if;

  update public.comments
  set resolved = p_resolved,
      resolved_by = case when p_resolved then auth.uid() end,
      resolved_at = case when p_resolved then now() end
  where id = p_comment_id;

  insert into public.events (document_id, version_id, type, actor_id, metadata)
  values (d.id, d.current_version_id,
          case when p_resolved then 'comment_resolved' else 'comment_reopened' end,
          auth.uid(),
          jsonb_build_object('comment_id', c.id, 'excerpt', left(c.body, 140)));
end $$;

-- =====================================================================
-- 8. Customer: Approve / Request changes
-- =====================================================================
create or replace function public.customer_set_status(
  p_doc_id uuid, p_action text, p_message text default null
) returns void
language plpgsql security definer set search_path = public as $$
declare
  d public.documents%rowtype;
begin
  select * into d from public.documents where id = p_doc_id for update;

  if not found or not coalesce(d.customer_org_id = public.my_org_id(), false) then
    raise exception 'Not allowed or not found';
  end if;
  if d.status = 'final' then raise exception 'Document is final and locked'; end if;

  if p_action = 'approve' then
    if d.status not in ('uploaded', 'in_review', 'revised') then
      raise exception 'Cannot approve a document in status %', d.status;
    end if;
    perform public._set_status(p_doc_id, 'approved', auth.uid());

  elsif p_action = 'request_changes' then
    if d.status not in ('uploaded', 'in_review', 'revised', 'approved') then
      raise exception 'Cannot request changes in status %', d.status;
    end if;
    perform public._set_status(p_doc_id, 'changes_requested', auth.uid(),
      jsonb_build_object('message', left(coalesce(p_message, ''), 1000)));

  else
    raise exception 'Unknown action';
  end if;
end $$;

-- =====================================================================
-- 9. Business: upload a new version (note required)
-- =====================================================================
create or replace function public.upload_version(
  p_doc_id uuid, p_file_path text, p_file_name text, p_note text
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  d public.documents%rowtype;
  v_next int;
  v_id uuid := gen_random_uuid();
begin
  if not public.is_business() then
    raise exception 'Only business users can upload versions';
  end if;
  if coalesce(trim(p_note), '') = '' then
    raise exception 'A note describing the change is required';
  end if;

  select * into d from public.documents where id = p_doc_id for update;
  if not found then raise exception 'Document not found'; end if;
  if d.status = 'final' then raise exception 'Document is final and locked'; end if;

  select coalesce(max(version_number), 0) + 1 into v_next
  from public.document_versions where document_id = p_doc_id;

  if not starts_with(p_file_path,
       d.customer_org_id::text || '/' || p_doc_id::text || '/v' || v_next || '_') then
    raise exception 'Version number changed. Refresh the page and try again';
  end if;

  if not exists (select 1 from storage.objects
                 where bucket_id = 'documents' and name = p_file_path) then
    raise exception 'Uploaded file not found in storage';
  end if;

  insert into public.document_versions
    (id, document_id, version_number, file_path, file_name, note, uploaded_by)
  values (v_id, p_doc_id, v_next, p_file_path, p_file_name, trim(p_note), auth.uid());

  update public.documents
  set current_version_id = v_id, updated_at = now()
  where id = p_doc_id;

  perform public._set_status(p_doc_id, 'revised', auth.uid());
  return v_id;
end $$;

-- =====================================================================
-- 10. Business: restore an old version as a NEW version (nothing deleted)
-- =====================================================================
create or replace function public.restore_version(
  p_doc_id uuid, p_version_id uuid, p_note text default null
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  d public.documents%rowtype;
  src public.document_versions%rowtype;
  v_next int;
  v_id uuid := gen_random_uuid();
begin
  if not public.is_business() then
    raise exception 'Only business users can restore versions';
  end if;

  select * into d from public.documents where id = p_doc_id for update;
  if not found then raise exception 'Document not found'; end if;
  if d.status = 'final' then raise exception 'Document is final and locked'; end if;

  select * into src from public.document_versions
  where id = p_version_id and document_id = p_doc_id;
  if not found then raise exception 'Version not found'; end if;

  select max(version_number) + 1 into v_next
  from public.document_versions where document_id = p_doc_id;

  insert into public.document_versions
    (id, document_id, version_number, file_path, file_name, note, uploaded_by, restored_from_version_id)
  values
    (v_id, p_doc_id, v_next, src.file_path, src.file_name,
     coalesce(nullif(trim(p_note), ''), 'Restored from v' || src.version_number),
     auth.uid(), src.id);

  update public.documents
  set current_version_id = v_id, updated_at = now()
  where id = p_doc_id;

  perform public._set_status(p_doc_id, 'revised', auth.uid());
  return v_id;
end $$;

-- =====================================================================
-- 11. Business: mark the approved version as FINAL (locks the document)
-- =====================================================================
create or replace function public.mark_final(p_doc_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare
  d public.documents%rowtype;
begin
  if not public.is_business() then
    raise exception 'Only business users can finalize documents';
  end if;

  select * into d from public.documents where id = p_doc_id for update;
  if not found then raise exception 'Document not found'; end if;
  if d.status <> 'approved' then
    raise exception 'Only an approved document can be marked final';
  end if;

  update public.documents
  set final_version_id = d.current_version_id, updated_at = now()
  where id = p_doc_id;

  perform public._set_status(p_doc_id, 'final', auth.uid(),
    jsonb_build_object('final_version_id', d.current_version_id));
end $$;

-- =====================================================================
-- 12. Who may call what
-- =====================================================================
revoke execute on function
  public.create_document(uuid, uuid, text, text, text, text),
  public.set_comment_resolved(uuid, boolean),
  public.customer_set_status(uuid, text, text),
  public.upload_version(uuid, text, text, text),
  public.restore_version(uuid, uuid, text),
  public.mark_final(uuid)
from public, anon;

grant execute on function
  public.create_document(uuid, uuid, text, text, text, text),
  public.set_comment_resolved(uuid, boolean),
  public.customer_set_status(uuid, text, text),
  public.upload_version(uuid, text, text, text),
  public.restore_version(uuid, uuid, text),
  public.mark_final(uuid)
to authenticated;