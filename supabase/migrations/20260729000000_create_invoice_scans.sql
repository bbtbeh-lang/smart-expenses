-- Income-side counterpart to receipt_scans/receipts (see
-- 20260702000000_create_receipt_scans.sql and 20260705000000_receipt_storage.sql).
-- Stores a perceptual hash ("fingerprint") of every saved sales/income
-- invoice image per user, so we can warn them if they scan the same
-- invoice twice, plus a private bucket to archive the actual invoice
-- photo for CRA six-year record-keeping requirements.

create table if not exists invoice_scans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  phash text not null,
  client_name text,
  amount numeric,
  invoice_date date,
  storage_path text,
  created_at timestamptz not null default now()
);

create index if not exists invoice_scans_user_id_idx on invoice_scans(user_id);
create index if not exists invoice_scans_user_created_idx on invoice_scans(user_id, created_at desc);

alter table invoice_scans enable row level security;

-- Users can read only their own scan history.
create policy "read_own_invoice_scans" on invoice_scans
  for select to authenticated
  using (auth.uid() = user_id);

-- Writes happen only from the server (service role key), same pattern as
-- receipt_scans, so no insert/update policy is needed here.

-- Private bucket to archive invoice photos, mirroring the "receipts" bucket.
insert into storage.buckets (id, name, public)
values ('invoices', 'invoices', false)
on conflict (id) do nothing;

-- Files are stored under a path like "{user_id}/{hash}.jpg" — these
-- policies let a user read/write only inside their own folder.
create policy "read_own_invoice_files" on storage.objects
  for select to authenticated
  using (bucket_id = 'invoices' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "insert_own_invoice_files" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'invoices' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "delete_own_invoice_files" on storage.objects
  for delete to authenticated
  using (bucket_id = 'invoices' and (storage.foldername(name))[1] = auth.uid()::text);
