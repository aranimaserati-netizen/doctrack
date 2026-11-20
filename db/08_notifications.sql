-- 1. Per-user opt-in flag (default OFF)
alter table public.profiles
  add column if not exists email_notifications boolean not null default false;

-- 2. Users change ONLY this flag, through a function.
--    (profiles has no update policy, so nobody can edit their own role.)
create or replace function public.set_email_notifications(p_enabled boolean)
returns void
language sql security definer set search_path = public as $$
  update public.profiles
  set email_notifications = p_enabled
  where id = auth.uid();
$$;

-- 3. Who should be emailed about activity on a document?
--    Returns the OTHER side's opted-in users, never the caller.
--    Returns nothing if the caller can't see the document.
create or replace function public.get_notification_recipients(p_doc_id uuid)
returns table (email text, full_name text, role public.user_role)
language plpgsql stable security definer set search_path = public as $$
declare
  d public.documents%rowtype;
  v_role public.user_role;
begin
  select * into d from public.documents where id = p_doc_id;
  if not found then return; end if;

  select p.role into v_role from public.profiles p where p.id = auth.uid();
  if v_role is null then return; end if;

  if v_role = 'customer' then
    if d.customer_org_id is distinct from public.my_org_id() then return; end if;
    return query
      select p.email, p.full_name, p.role from public.profiles p
      where p.role = 'business' and p.email_notifications and p.id <> auth.uid();
  else
    return query
      select p.email, p.full_name, p.role from public.profiles p
      where p.role = 'customer' and p.customer_org_id = d.customer_org_id
        and p.email_notifications and p.id <> auth.uid();
  end if;
end $$;

revoke execute on function public.set_email_notifications(boolean) from public, anon;
revoke execute on function public.get_notification_recipients(uuid) from public, anon;
grant execute on function public.set_email_notifications(boolean) to authenticated;
grant execute on function public.get_notification_recipients(uuid) to authenticated;