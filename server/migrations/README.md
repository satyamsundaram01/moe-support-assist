# Database Migrations

This directory contains database migrations for the MoEngage Support Agent Ask Mode tables.

## Overview

The migration system supports PostgreSQL databases and automatically handles:
- Database schema creation
- Index creation
- Migration tracking
- Checksum validation

## Migration Files

### PostgreSQL Migrations
- `001_initial_schema.sql` - Initial schema for PostgreSQL

## Tables Created

### 1. analytics_events
Stores flexible analytics events as JSONB.

**Columns:**
- `id` - Primary key
- `event_data` - JSONB event data
- `created_at` - Timestamp

### 2. sessions
Stores Discovery Engine session information.

**Columns:**
- `id` - Session ID (Primary key)
- `user_id` - User identifier
- `app_name` - Application name
- `create_time` - Creation timestamp
- `update_time` - Last update timestamp
- `state` - Session state as JSONB

### 3. announcements
Stores system announcements and notifications.

**Columns:**
- `id` - Announcement ID (Primary key)
- `enabled` - Whether announcement is active
- `type` - Type: 'banner' or 'toast'
- `severity` - Severity: 'info', 'success', 'warning', 'error'
- `title` - Announcement title
- `message` - Announcement message
- `dismissible` - Whether user can dismiss
- `max_impressions_per_user` - Maximum impressions per user
- `frequency` - Display frequency
- `starts_at` - Start date/time
- `ends_at` - End date/time
- `created_at` - Creation timestamp
- `updated_at` - Last update timestamp

### 4. announcement_impressions
Tracks which users have seen which announcements.

**Columns:**
- `id` - Primary key
- `announcement_id` - Reference to announcements table
- `user_id` - User identifier
- `seen_at` - When user saw the announcement

### 5. announcement_dismissals
Tracks which users have dismissed which announcements.

**Columns:**
- `announcement_id` - Reference to announcements table
- `user_id` - User identifier
- `dismissed_at` - When user dismissed the announcement

### 6. prompt_library
Stores reusable prompt templates.

**Columns:**
- `id` - Prompt ID (Primary key)
- `title` - Prompt title
- `description` - Prompt description
- `content` - Prompt content
- `category` - Prompt category
- `tags` - JSONB array of tags
- `likes` - Number of likes
- `is_favorite` - Whether marked as favorite
- `is_public` - Whether publicly visible
- `created_at` - Creation timestamp
- `created_by` - Creator user ID

## Usage

### Local Development

1. **Run migrations:**
   ```bash
   ./run_migrations.sh
   ```

2. **Or manually:**
   ```bash
   python3 migrations/migrate.py run
   ```

3. **Check migration status:**
   ```bash
   python3 migrations/migrate.py status
   ```

4. **Dry run (see what would be applied):**
   ```bash
   python3 migrations/migrate.py dry-run
   ```

### Docker

Migrations are automatically run when the Docker container starts. The entrypoint script:
1. Runs all pending migrations
2. Starts the server only if migrations succeed

### Production

For production deployments:
1. Ensure your database URL is set in environment variables
2. Run migrations before starting the application
3. Monitor migration logs for any issues

## Migration Commands

```bash
# Run all pending migrations
python3 migrations/migrate.py run

# Show migration status
python3 migrations/migrate.py status

# Dry run (show what would be applied)
python3 migrations/migrate.py dry-run
```

## Adding New Migrations

1. Create a new SQL file in the migrations directory
2. Use the naming convention: `XXX_description.sql` (e.g., `002_add_user_preferences.sql`)
3. Include the migration record insertion at the end of your SQL file

### Example Migration File

```sql
-- Migration: 002_add_user_preferences.sql
-- Description: Add user preferences table
-- Created: 2025-01-30

CREATE TABLE IF NOT EXISTS user_preferences (
    user_id TEXT PRIMARY KEY,
    theme TEXT DEFAULT 'light',
    language TEXT DEFAULT 'en',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_preferences_theme ON user_preferences(theme);

-- Insert migration record
INSERT INTO migrations (migration_name, checksum) 
VALUES ('002_add_user_preferences', 'user_preferences_v1')
ON CONFLICT (migration_name) DO NOTHING;
```

## Database Support

### PostgreSQL
- Uses `asyncpg` for connections
- Supports JSONB data types
- Uses `TIMESTAMPTZ` for timestamps
- Supports advanced indexing (GIN for JSONB)

## Troubleshooting

### Common Issues

1. **Migration already applied:**
   - The system tracks applied migrations and won't re-apply them
   - Check status with `python3 migrations/migrate.py status`

2. **Database connection issues:**
   - Ensure your database URL is correctly configured
   - Check that the database server is running
   - Verify network connectivity for remote databases

3. **Permission issues:**
   - Ensure the application has write permissions to the database

4. **Schema conflicts:**
   - The system uses `CREATE TABLE IF NOT EXISTS` to avoid conflicts
   - If you need to modify existing tables, create a new migration

### Logs

Migration logs include:
- Which migrations are being applied
- Success/failure status for each migration
- Any errors encountered during the process

## Best Practices

1. **Always test migrations locally first**
2. **Backup your database before running migrations in production**
3. **Use descriptive migration names**
4. **Include proper indexes for performance**
5. **Keep migrations idempotent (safe to run multiple times)** 