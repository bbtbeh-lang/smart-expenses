-- Income transactions created from a scanned invoice already archive the
-- photo (see 20260705000000_receipt_storage.sql's sibling table
-- invoice_scans / 'invoices' bucket), but the transaction row itself never
-- stored the invoiceHash needed to look that photo back up later — unlike
-- expense transactions, which do via receipt_hash. This brings income
-- transactions to parity so the "view photo" button works for both.
alter table transactions add column if not exists invoice_hash text;
