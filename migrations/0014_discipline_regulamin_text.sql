-- Regulamin can now be a PDF upload (regulamin_key, existing), free text written
-- directly in the admin panel (regulamin_text), or both at once.
ALTER TABLE disciplines ADD COLUMN regulamin_text TEXT;
