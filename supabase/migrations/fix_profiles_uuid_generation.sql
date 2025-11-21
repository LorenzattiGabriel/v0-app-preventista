-- Fix profiles table UUID generation
-- Change from uuid_generate_v4() (requires extension) to gen_random_uuid() (native)

-- Update the default value for the id column
ALTER TABLE profiles 
ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- Enable uuid-ossp extension if needed for other tables
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Verify the change
COMMENT ON COLUMN profiles.id IS 'Auto-generated UUID using gen_random_uuid()';

