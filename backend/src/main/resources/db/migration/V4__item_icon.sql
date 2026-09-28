-- A picture for each item, picked from presets in the app. Stored as the emoji
-- itself rather than a key into a list: it is text, so it survives a pg_dump,
-- a JSON export and a future change to the presets without a lookup table.
-- 16 is room for the longest emoji sequences; nothing else goes in here.
ALTER TABLE items ADD COLUMN icon VARCHAR(16);
