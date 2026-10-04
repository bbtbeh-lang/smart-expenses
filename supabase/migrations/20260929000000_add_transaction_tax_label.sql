-- Stores the exact tax label as printed on the source receipt/invoice
-- ("GST", "MwSt", "VAT"...) instead of only the numeric tax_amount, so the
-- Excel/PDF tax report can show what the document actually said rather
-- than a generic "Tax" for every row regardless of country.
alter table transactions add column if not exists tax_label text;
