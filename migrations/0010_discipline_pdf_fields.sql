-- Regulamin/Listy startowe/Wyniki move from being separate documents matched by
-- category+discipline slug to three direct PDF fields on the discipline itself,
-- managed straight from the "Nowa/Edytuj dyscyplina" admin form.
ALTER TABLE disciplines ADD COLUMN regulamin_key TEXT;
ALTER TABLE disciplines ADD COLUMN listy_startowe_key TEXT;
ALTER TABLE disciplines ADD COLUMN wyniki_key TEXT;
