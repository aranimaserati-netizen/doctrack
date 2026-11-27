alter table public.documents
  add column if not exists edits jsonb not null default '[]'::jsonb;

create or replace function public.save_document_edits(p_doc_id uuid, p_edits jsonb)
returns void
language plpgsql security definer set search_path = public as $$
declare d public.documents%rowtype;
begin
  if not public.is_business() then raise exception 'Only business users can edit documents'; end if;
  if jsonb_typeof(p_edits) <> 'array' or octet_length(p_edits::text) > 500000 then
    raise exception 'Invalid or too many edits';
  end if;

  select * into d from public.documents where id = p_doc_id for update;
  if not found then raise exception 'Document not found'; end if;
  if d.status = 'final' then raise exception 'Document is final and locked'; end if;

  update public.documents set edits = p_edits, updated_at = now() where id = p_doc_id;

  insert into public.events (document_id, version_id, type, actor_id, metadata)
  values (p_doc_id, d.current_version_id, 'content_edited', auth.uid(),
          jsonb_build_object('count', jsonb_array_length(p_edits)));

  -- Editing after approval sends it back for approval
  if d.status = 'approved' then
    perform public._set_status(p_doc_id, 'revised', auth.uid(),
      jsonb_build_object('reason', 'edited_after_approval'));
  end if;
end $$;

revoke execute on function public.save_document_edits(uuid, jsonb) from public, anon;
grant execute on function public.save_document_edits(uuid, jsonb) to authenticated;