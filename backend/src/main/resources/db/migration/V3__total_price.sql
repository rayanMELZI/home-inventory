-- unit_price NUMERIC(10,2) could not hold a per-gram price: rice at 0.004 a
-- gram rounded to 0.00 and its spending silently disappeared from the totals.
--
-- Storing what was actually paid for the line fixes the precision problem
-- outright (money really is two decimal places), and it is also the number
-- the person has in front of them on the receipt. Price per unit is still
-- available whenever it is wanted — it is total_price / quantity_delta.
ALTER TABLE item_events RENAME COLUMN unit_price TO total_price;

COMMENT ON COLUMN item_events.total_price IS
    'What changed hands for this line: money out on a PURCHASE, money in on a SELL.';
