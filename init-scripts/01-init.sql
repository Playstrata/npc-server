-- Freedom World Database Initialization Script
-- This script will run when the PostgreSQL container starts for the first time

-- Create extensions if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Set timezone
SET timezone = 'UTC';

-- Create a dedicated user for the application (optional but recommended)
-- DO $$ 
-- BEGIN
--     IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'freedom_world_user') THEN
--         CREATE ROLE freedom_world_user WITH LOGIN PASSWORD 'freedom_world_pass';
--         GRANT ALL PRIVILEGES ON DATABASE freedom_world_db TO freedom_world_user;
--     END IF;
-- END
-- $$;

-- Log initialization
SELECT 'Freedom World Database initialized successfully!' as message;