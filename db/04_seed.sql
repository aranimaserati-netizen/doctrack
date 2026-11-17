-- Customer orgs (fixed IDs make testing easier)
insert into public.customer_orgs (id, name) values
  ('a0000000-0000-0000-0000-000000000001', 'Customer A Ltd'),
  ('b0000000-0000-0000-0000-000000000002', 'Customer B Ltd');

-- Profiles linked to the auth users you created
insert into public.profiles (id, full_name, email, role, customer_org_id)
select id, 'Business Admin', email, 'business', null
from auth.users where email = 'business@demo.com';

insert into public.profiles (id, full_name, email, role, customer_org_id)
select id, 'Alice (Customer A)', email, 'customer', 'a0000000-0000-0000-0000-000000000001'
from auth.users where email = 'alice@customer-a.com';

insert into public.profiles (id, full_name, email, role, customer_org_id)
select id, 'Bob (Customer B)', email, 'customer', 'b0000000-0000-0000-0000-000000000002'
from auth.users where email = 'bob@customer-b.com';

-- One sample document per org (runs as admin, so RLS is bypassed)
insert into public.documents (id, customer_org_id, title, created_by) values
  ('d0000000-0000-0000-0000-00000000000a', 'a0000000-0000-0000-0000-000000000001',
   'Customer A - Service Agreement', (select id from public.profiles where email = 'business@demo.com')),
  ('d0000000-0000-0000-0000-00000000000b', 'b0000000-0000-0000-0000-000000000002',
   'Customer B - NDA', (select id from public.profiles where email = 'business@demo.com'));

insert into public.document_versions (id, document_id, version_number, file_path, file_name, note, uploaded_by) values
  ('e0000000-0000-0000-0000-00000000000a', 'd0000000-0000-0000-0000-00000000000a', 1,
   'a0000000-0000-0000-0000-000000000001/d0000000-0000-0000-0000-00000000000a/v1_sample.pdf',
   'sample.pdf', 'Initial upload', (select id from public.profiles where email = 'business@demo.com')),
  ('e0000000-0000-0000-0000-00000000000b', 'd0000000-0000-0000-0000-00000000000b', 1,
   'b0000000-0000-0000-0000-000000000002/d0000000-0000-0000-0000-00000000000b/v1_sample.pdf',
   'sample.pdf', 'Initial upload', (select id from public.profiles where email = 'business@demo.com'));

update public.documents set current_version_id = 'e0000000-0000-0000-0000-00000000000a'
  where id = 'd0000000-0000-0000-0000-00000000000a';
update public.documents set current_version_id = 'e0000000-0000-0000-0000-00000000000b'
  where id = 'd0000000-0000-0000-0000-00000000000b';

-- One comment per org (so isolation can be tested on comments too)
insert into public.comments (document_id, version_id, author_id, body, page_number) values
  ('d0000000-0000-0000-0000-00000000000a', 'e0000000-0000-0000-0000-00000000000a',
   (select id from public.profiles where email = 'alice@customer-a.com'), 'Please review clause 4.', 1),
  ('d0000000-0000-0000-0000-00000000000b', 'e0000000-0000-0000-0000-00000000000b',
   (select id from public.profiles where email = 'bob@customer-b.com'), 'Is the term 2 years?', 1);

-- Timeline events
insert into public.events (document_id, version_id, type, actor_id) values
  ('d0000000-0000-0000-0000-00000000000a', 'e0000000-0000-0000-0000-00000000000a', 'version_uploaded',
   (select id from public.profiles where email = 'business@demo.com')),
  ('d0000000-0000-0000-0000-00000000000b', 'e0000000-0000-0000-0000-00000000000b', 'version_uploaded',
   (select id from public.profiles where email = 'business@demo.com'));