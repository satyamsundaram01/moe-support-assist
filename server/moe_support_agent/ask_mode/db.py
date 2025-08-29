import asyncpg
from fastapi import Depends
import asyncio
import os
import sys

# Import configuration
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
from config import config

# Get database URL from configuration
DB_URL = config.database_url

async def get_db():
    conn = await asyncpg.connect(DB_URL)
    try:
        yield conn
    finally:
        await conn.close()
