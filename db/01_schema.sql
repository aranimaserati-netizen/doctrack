-- Enums
create type public.user_role as enum ('business', 'customer');
create type public.doc_status as enum
  ('uploaded', 'in_review', 'changes_requested', 'revised', 'approved', 'final');

-- Customer organizations
create table public.customer_orgs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

-- Profiles (one per auth user)
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text,
  role public.user_role not null,
  customer_org_id uuid references public.customer_orgs(id),
  created_at timestamptz not null default now(),
  constraint customer_requires_org
    check (role = 'business' or customer_org_id is not null)
);

-- Documents
create table public.documents (
  id uuid primary key default gen_random_uuid(),
  customer_org_id uuid not null references public.customer_orgs(id),
  title text not null,
  status public.doc_status not null default 'uploaded',
  current_version_id uuid,
  final_version_id uuid,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Versions (immutable)
create table public.document_versions (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents(id),
  version_number int not null,
  file_path text not null,
  file_name text,
  note text,
  uploaded_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  unique (document_id, version_number)
);

alter table public.documents
  add constraint documents_current_version_fk
    foreign key (current_version_id) references public.document_versions(id),
  add constraint documents_final_version_fk
    foreign key (final_version_id) references public.document_versions(id);

-- Comments (anchored to a version, threaded via parent_id)
create table public.comments (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents(id),
  version_id uuid not null references public.document_versions(id),
  parent_id uuid references public.comments(id),
  author_id uuid not null references public.profiles(id),
  body text not null,
  page_number int,
  selected_text text,
  position jsonb,
  resolved boolean not null default false,
  resolved_by uuid references public.profiles(id),
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);

-- Events (immutable timeline log)
create table public.events (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents(id),
  version_id uuid references public.document_versions(id),
  type text not null,
  actor_id uuid not null references public.profiles(id),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Indexes for common lookups
create index on public.documents (customer_org_id);
create index on public.document_versions (document_id);
create index on public.comments (document_id, version_id);
create index on public.events (document_id, created_at);