-- 1. Users must be able to see the people they interact with.
--    Without this, a customer sees "null" as the author of business comments.
drop policy if exists "read own profile or business reads all" on public.profiles;
create policy "read profiles of counterparts" on public.profiles
  for select to authenticated
  using (
    id = auth.uid()
    or public.is_business()
    or role = 'business'
    or customer_org_id = public.my_org_id()
  );

-- 2. A comment's version must belong to the same document
--    (Day 1 let a comment reference any version).
drop policy if exists "comment on visible, non-final documents" on public.comments;
create policy "comment on visible, non-final documents" on public.comments
  for insert to authenticated
  with check (
    author_id = auth.uid()
    and exists (
      select 1 from public.documents d
      where d.id = comments.document_id and d.status <> 'final'
    )
    and exists (
      select 1 from public.document_versions v
      where v.id = comments.version_id and v.document_id = comments.document_id
    )
  );

-- 3. Events are written ONLY by triggers (cannot be forged from the client)
drop policy if exists "log events on visible documents" on public.events;
revoke insert on public.events from authenticated;

create or replace function public.trg_version_uploaded()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.events (document_id, version_id, type, actor_id, metadata)
  values (
    new.document_id, new.id, 'version_uploaded', new.uploaded_by,
    jsonb_build_object(
      'version_number', new.version_number,
      'file_name', new.file_name,
      'note', new.note
    )
  );
  return new;
end $$;

drop trigger if exists version_uploaded_event on public.document_versions;
create trigger version_uploaded_event
  after insert on public.document_versions
  for each row execute function public.trg_version_uploaded();

create or replace function public.trg_comment_added()
returns trigger language plpgsql security definer set search_path = public as $$
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
  return new;
end $$;

drop trigger if exists comment_added_event on public.comments;
create trigger comment_added_event
  after insert on public.comments
  for each row execute function public.trg_comment_added();

-- 4. Create a document + v1 atomically (all rows or none).
--    SECURITY INVOKER means RLS still applies to the caller.
create or replace function public.create_document(
  p_doc_id uuid,
  p_org_id uuid,
  p_title text,
  p_file_path text,
  p_file_name text,
  p_note text
) returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_version_id uuid := gen_random_uuid();
begin
  if not public.is_business() then
    raise exception 'Only business users can create documents';
  end if;

  if not starts_with(p_file_path, p_org_id::text || '/' || p_doc_id::text || '/v1_') then
    raise exception 'File path does not match the document';
  end if;

  if not exists (
    select 1 from storage.objects
    where bucket_id = 'documents' and name = p_file_path
  ) then
    raise exception 'Uploaded file not found in storage';
  end if;

  insert into public.documents (id, customer_org_id, title, status, created_by)
  values (p_doc_id, p_org_id, p_title, 'uploaded', auth.uid());

  insert into public.document_versions
    (id, document_id, version_number, file_path, file_name, note, uploaded_by)
  values
    (v_version_id, p_doc_id, 1, p_file_path, p_file_name, p_note, auth.uid());

  update public.documents
  set current_version_id = v_version_id, updated_at = now()
  where id = p_doc_id;

  return p_doc_id;
end $$;

revoke execute on function public.create_document(uuid, uuid, text, text, text, text) from public, anon;
grant execute on function public.create_document(uuid, uuid, text, text, text, text) to authenticated;