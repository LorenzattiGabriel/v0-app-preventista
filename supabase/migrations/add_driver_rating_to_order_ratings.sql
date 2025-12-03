-- Add driver rating to order_ratings table
-- This allows customers to rate both the order and the delivery driver

ALTER TABLE order_ratings
ADD COLUMN IF NOT EXISTS driver_rating INTEGER CHECK (driver_rating >= 1 AND driver_rating <= 5),
ADD COLUMN IF NOT EXISTS driver_comments TEXT;

-- Add comment
COMMENT ON COLUMN order_ratings.driver_rating IS 'Rating given to the delivery driver (1-5 stars)';
COMMENT ON COLUMN order_ratings.driver_comments IS 'Additional comments about the driver service';

-- Rename existing columns for clarity
COMMENT ON COLUMN order_ratings.rating IS 'Rating given to the order/products (1-5 stars)';
COMMENT ON COLUMN order_ratings.comments IS 'Comments about the order/products';

