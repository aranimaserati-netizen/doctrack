-- Helper functions. SECURITY DEFINER avoids infinite recursion when
-- policies on other tables need to look up the caller's profile.
create or replace function public.is_business()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'business'
  );
$$;

create or replace function public.my_org_id()
returns uuid language sql stable security definer set search_path = public as $$
  select customer_org_id from public.profiles where id = auth.uid();
$$;

-- Turn RLS on everywhere
alter table public.customer_orgs      enable row level security;
alter table public.profiles           enable row level security;
alter table public.documents          enable row level security;
alter table public.document_versions  enable row level security;
alter table public.comments           enable row level security;
alter table public.events             enable row level security;

-- Anonymous (logged-out) users get nothing
revoke all on all tables in schema public from anon;

-- Versions and events are insert-only: remove update/delete entirely
revoke update, delete on public.document_versions from authenticated;
revoke update, delete on public.events from authenticated;
revoke delete on public.comments from authenticated;
revoke delete on public.documents from authenticated;

-- PROFILES
create policy "read own profile or business reads all" on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.is_business());

-- CUSTOMER ORGS
create policy "read own org or business reads all" on public.customer_orgs
  for select to authenticated
  using (public.is_business() or id = public.my_org_id());

create policy "business creates orgs" on public.customer_orgs
  for insert to authenticated
  with check (public.is_business());

-- DOCUMENTS
create policy "read documents of own org or business" on public.documents
  for select to authenticated
  using (public.is_business() or customer_org_id = public.my_org_id());

create policy "business creates documents" on public.documents
  for insert to authenticated
  with check (public.is_business() and created_by = auth.uid());

create policy "business updates documents" on public.documents
  for update to authenticated
  using (public.is_business())
  with check (public.is_business());
-- NOTE: customer status changes (Request changes / Approve) come on Day 3
-- through a controlled database function, not a broad update policy.

-- DOCUMENT VERSIONS (visibility follows the parent document's RLS)
create policy "read versions of visible documents" on public.document_versions
  for select to authenticated
  using (exists (
    select 1 from public.documents d where d.id = document_versions.document_id
  ));

create policy "business uploads versions" on public.document_versions
  for insert to authenticated
  with check (public.is_business() and uploaded_by = auth.uid());

-- COMMENTS
create policy "read comments of visible documents" on public.comments
  for select to authenticated
  using (exists (
    select 1 from public.documents d where d.id = comments.document_id
  ));

create policy "comment on visible, non-final documents" on public.comments
  for insert to authenticated
  with check (
    author_id = auth.uid()
    and exists (
      select 1 from public.documents d
      where d.id = comments.document_id and d.status <> 'final'
    )
  );
-- Resolve/reopen policy is added on Day 3.

-- EVENTS
create policy "read events of visible documents" on public.events
  for select to authenticated
  using (exists (
    select 1 from public.documents d where d.id = events.document_id
  ));

create policy "log events on visible documents" on public.events
  for insert to authenticated
  with check (
    actor_id = auth.uid()
    and exists (
      select 1 from public.documents d where d.id = events.document_id
    )
  );