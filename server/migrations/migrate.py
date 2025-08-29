#!/usr/bin/env python3
"""
Database migration manager for MoEngage Support Agent.
This script handles database migrations for PostgreSQL databases.
"""
import os
import sys
import asyncio
import asyncpg
import hashlib
from pathlib import Path
import logging
from typing import List, Optional
from urllib.parse import urlparse
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from config import config

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class MigrationManager:
    """Manages database migrations for PostgreSQL."""
    
    def __init__(self, database_url: str):
        self.database_url = database_url
        self.migrations_dir = Path(__file__).parent
        self.migrations_table = "migrations"

    def get_migration_files(self) -> List[Path]:
        """Get all migration files, excluding SQLite-specific ones."""
        migration_files = []
        for file in self.migrations_dir.glob("*.sql"):
            if file.name.startswith("0") and file.name.endswith(".sql") and not file.name.endswith("_sqlite.sql"):
                migration_files.append(file)
        return sorted(migration_files)

    def calculate_checksum(self, file_path: Path) -> str:
        """Calculate checksum for a migration file."""
        with open(file_path, 'rb') as f:
            return hashlib.md5(f.read()).hexdigest()

    async def create_migrations_table(self, conn: asyncpg.Connection):
        """Create migrations table if it doesn't exist."""
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS migrations (
                id SERIAL PRIMARY KEY,
                migration_name TEXT NOT NULL UNIQUE,
                applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                checksum TEXT NOT NULL
            )
        """)

    async def get_applied_migrations(self, conn: asyncpg.Connection) -> dict:
        """Get list of applied migrations with their checksums."""
        rows = await conn.fetch("SELECT migration_name, checksum FROM migrations")
        return {row['migration_name']: row['checksum'] for row in rows}

    async def apply_migration(self, conn: asyncpg.Connection, file_path: Path, dry_run: bool = False) -> bool:
        """Apply a single migration."""
        migration_name = file_path.name
        checksum = self.calculate_checksum(file_path)
        
        logger.info(f"Applying migration: {migration_name}")
        
        if dry_run:
            logger.info(f"  [DRY RUN] Would apply: {migration_name}")
            return True
        
        try:
            # Read and execute migration SQL
            with open(file_path, 'r') as f:
                sql_content = f.read()
            
            await conn.execute(sql_content)
            
            # Record migration
            await conn.execute("""
                INSERT INTO migrations (migration_name, checksum) 
                VALUES ($1, $2)
                ON CONFLICT (migration_name) DO NOTHING
            """, migration_name, checksum)
            
            logger.info(f"✅ Applied migration: {migration_name}")
            return True
            
        except Exception as e:
            logger.error(f"❌ Failed to apply migration {migration_name}: {e}")
            return False

    async def ensure_database_exists(self):
        """Ensure the target database exists, creating it if necessary."""
        try:
            # Extract connection components more reliably
            db_url = self.database_url
            
            # Get database name
            db_name = db_url.split("/")[-1].split("?")[0]
            if not db_name:
                logger.error(f"Could not extract database name from {db_url}")
                return False
                
            # Create a connection string to the default postgres database
            postgres_url = db_url.replace(f"/{db_name}", "/postgres")
            
            logger.info(f"Connecting to postgres database to check if '{db_name}' exists...")
            
            try:
                # Try connecting to the database directly first to see if it exists
                conn = await asyncpg.connect(db_url)
                await conn.close()
                logger.info(f"Database '{db_name}' already exists.")
                return True
            except asyncpg.InvalidCatalogNameError:
                # Database doesn't exist, we'll create it
                logger.info(f"Database '{db_name}' does not exist. Will create it.")
                pass
            except Exception as e:
                # Some other error occurred while connecting to the target DB
                logger.error(f"Error checking database: {e}")
                raise
                
            # Connect to postgres to create the database
            try:
                logger.info(f"Connecting to postgres database...")
                conn = await asyncpg.connect(postgres_url)
                
                # Create the database
                logger.info(f"Creating database '{db_name}'...")
                await conn.execute(f'CREATE DATABASE "{db_name}"')
                
                await conn.close()
                logger.info(f"Database '{db_name}' created successfully.")
                return True
                
            except Exception as e:
                logger.error(f"Failed to create database: {e}")
                raise
                
        except Exception as e:
            logger.error(f"Failed to ensure database exists: {str(e)}")
            return False
        
    async def run_migrations(self, dry_run: bool = False) -> bool:
        """Run all pending migrations."""
        logger.info("🚀 Starting database migrations...")
        
        # Ensure database exists before attempting migrations
        if not await self.ensure_database_exists():
            logger.error("Failed to ensure database exists, cannot run migrations")
            return False
            
        try:
            conn = await asyncpg.connect(self.database_url)
            
            # Create migrations table
            await self.create_migrations_table(conn)
            
            # Get applied migrations
            applied_migrations = await self.get_applied_migrations(conn)
            
            # Get all migration files
            migration_files = self.get_migration_files()
            
            if not migration_files:
                logger.info("No migration files found")
                return True
            
            # Find pending migrations
            pending_migrations = []
            for file_path in migration_files:
                migration_name = file_path.name
                if migration_name not in applied_migrations:
                    pending_migrations.append(file_path)
                else:
                    # Verify checksum
                    expected_checksum = self.calculate_checksum(file_path)
                    actual_checksum = applied_migrations[migration_name]
                    if expected_checksum != actual_checksum:
                        logger.warning(f"⚠️  Checksum mismatch for {migration_name}")
                        pending_migrations.append(file_path)
            
            if not pending_migrations:
                logger.info("✅ All migrations are up to date")
                return True
            
            logger.info(f"Found {len(pending_migrations)} pending migrations")
            
            # Apply migrations
            success_count = 0
            for file_path in pending_migrations:
                if await self.apply_migration(conn, file_path, dry_run):
                    success_count += 1
                else:
                    break
            
            await conn.close()
            
            if success_count == len(pending_migrations):
                logger.info(f"✅ Successfully applied {success_count} migrations")
                return True
            else:
                logger.error(f"❌ Failed to apply all migrations ({success_count}/{len(pending_migrations)})")
                return False
                
        except Exception as e:
            logger.error(f"❌ Migration failed: {e}")
            return False

    async def show_status(self):
        """Show migration status."""
        logger.info("📊 Migration Status")
        
        # Ensure database exists before checking status
        if not await self.ensure_database_exists():
            logger.error("Failed to ensure database exists, cannot check status")
            return
            
        try:
            conn = await asyncpg.connect(self.database_url)
            
            # Create migrations table if it doesn't exist
            await self.create_migrations_table(conn)
            
            # Get applied migrations
            applied_migrations = await self.get_applied_migrations(conn)
            
            # Get all migration files
            migration_files = self.get_migration_files()
            
            logger.info(f"Total migration files: {len(migration_files)}")
            logger.info(f"Applied migrations: {len(applied_migrations)}")
            
            for file_path in migration_files:
                migration_name = file_path.name
                if migration_name in applied_migrations:
                    status = "✅ Applied"
                else:
                    status = "⏳ Pending"
                logger.info(f"  {migration_name}: {status}")
            
            await conn.close()
            
        except Exception as e:
            logger.error(f"❌ Failed to get migration status: {e}")

async def main():
    """Main function."""
    if len(sys.argv) < 2:
        print("Usage: python migrate.py <command>")
        print("Commands: run, status, dry-run")
        sys.exit(1)
    
    command = sys.argv[1]
    database_url = config.database_url
    manager = MigrationManager(database_url)
    
    if command == "run":
        success = await manager.run_migrations(dry_run=False)
        sys.exit(0 if success else 1)
    elif command == "status":
        await manager.show_status()
    elif command == "dry-run":
        success = await manager.run_migrations(dry_run=True)
        sys.exit(0 if success else 1)
    else:
        print(f"Unknown command: {command}")
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(main())
