create or replace function public.mark_revised_no_changes(
  p_doc_id uuid, p_note text
) returns void
language plpgsql security definer set search_path = public as $$
declare
  d public.documents%rowtype;
begin
  if not public.is_business() then
    raise exception 'Only business users can do this';
  end if;
  if coalesce(trim(p_note), '') = '' then
    raise exception 'Please explain why no changes were made';
  end if;

  select * into d from public.documents where id = p_doc_id for update;
  if not found then raise exception 'Document not found'; end if;
  if d.status = 'final' then raise exception 'Document is final and locked'; end if;
  if d.status <> 'changes_requested' then
    raise exception 'Only a document with requested changes can be marked revised without changes';
  end if;

  perform public._set_status(
    p_doc_id, 'revised', auth.uid(),
    jsonb_build_object('no_file_change', true, 'note', left(trim(p_note), 1000))
  );
end $$;

revoke execute on function public.mark_revised_no_changes(uuid, text) from public, anon;
grant execute on function public.mark_revised_no_changes(uuid, text) to authenticated;