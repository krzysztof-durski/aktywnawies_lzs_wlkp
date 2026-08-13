ALTER TABLE gallery_images ADD COLUMN exclude_from_main INTEGER NOT NULL DEFAULT 0;
ALTER TABLE gallery_images ADD COLUMN featured INTEGER NOT NULL DEFAULT 0;
ALTER TABLE gallery_images ADD COLUMN featured_order INTEGER NOT NULL DEFAULT 0;

ALTER TABLE gallery_albums ADD COLUMN is_private INTEGER NOT NULL DEFAULT 0;

CREATE INDEX idx_gallery_images_featured ON gallery_images(featured, featured_order);
