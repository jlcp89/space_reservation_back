-- Initialize database with some sample data for testing
-- This file is executed when the PostgreSQL container starts for the first time

-- The tables will be created automatically by Sequelize, so we just add sample data

-- Note: This will only run the first time the database is created
-- Comment out these inserts if you want to start with an empty database

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'persons') THEN
        -- Database is being initialized for the first time
        -- Tables will be created by the application, so we don't need to create them here
        NULL;
    END IF;
END
$$;

-- You can add sample data here after tables are created by Sequelize
-- Example:
-- INSERT INTO persons (email, role, "createdAt", "updatedAt") 
-- VALUES 
-- ('admin@workspace.com', 'admin', NOW(), NOW()),
-- ('client1@workspace.com', 'client', NOW(), NOW()),
-- ('client2@workspace.com', 'client', NOW(), NOW())
-- ON CONFLICT (email) DO NOTHING;

-- INSERT INTO spaces (name, location, capacity, description, "createdAt", "updatedAt")
-- VALUES 
-- ('Conference Room A', 'Building 1, Floor 2', 12, 'Large conference room with projector', NOW(), NOW()),
-- ('Meeting Room B', 'Building 1, Floor 3', 6, 'Small meeting room', NOW(), NOW()),
-- ('Co-working Space', 'Building 2, Floor 1', 20, 'Open co-working area with hot desks', NOW(), NOW())
-- ON CONFLICT DO NOTHING;