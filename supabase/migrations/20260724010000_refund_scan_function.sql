-- Companion to consume_scan(): gives back one scan when an OCR request
-- that already consumed a scan then fails (Claude API error, malformed
-- response, etc.) — so a flaky/failed OCR call doesn't cost the user part
-- of their monthly quota for nothing.
create or replace function refund_scan(p_user_id uuid)
returns void as $$
begin
  update subscriptions
  set scans_used_this_period = greatest(scans_used_this_period - 1, 0),
      updated_at = now()
  where user_id = p_user_id;
end;
$$ language plpgsql;
