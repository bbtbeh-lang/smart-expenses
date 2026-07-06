-- A private bucket to archive the actual receipt photo, not just its
-- extracted data. Businesses are required to keep supporting documents
-- (receipts) for tax purposes — previously FinSnap discarded the image
-- after OCR, which left customers without a real archive.
insert into storage.buckets (id, name, public)
values ('receipts', 'receipts', false)
on conflict (id) do nothing;

-- Files are stored under a path like "{user_id}/{hash}.jpg" — these
-- policies let a user read/write only inside their own folder.
create policy "read_own_receipt_files" on storage.objects
  for select to authenticated
  using (bucket_id = 'receipts' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "insert_own_receipt_files" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'receipts' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "delete_own_receipt_files" on storage.objects
  for delete to authenticated
  using (bucket_id = 'receipts' and (storage.foldername(name))[1] = auth.uid()::text);

-- Tracks which storage path (if any) holds the archived image for a scan.
alter table receipt_scans add column if not exists storage_path text;

-- Lets a transaction be linked back to its archived receipt image.
alter table transactions add column if not exists receipt_hash text;
