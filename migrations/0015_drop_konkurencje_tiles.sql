-- "Kafelki konkurencji" (the photo tile grid on Konkurencje pages) removed per
-- client request — the sectioned discipline tables replace it. Note: any
-- uploaded tile images under the konkurencje-tiles/ R2 prefix are orphaned by
-- this and should be cleaned up manually via the R2 dashboard/wrangler if desired.
DROP TABLE IF EXISTS konkurencje_tiles;
