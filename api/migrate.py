#!/usr/bin/env python3
"""
One-time migration: remove privacy-violating data stores.
Run once: python3 api/migrate.py
"""
import asyncio
import os
import sys

# ── Load DATABASE_URL from config/.env ────────────────────────────────────────
_SITE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
_ENV_FILE = os.path.join(_SITE_DIR, "config", ".env")

DATABASE_URL = None
if os.path.exists(_ENV_FILE):
    with open(_ENV_FILE) as f:
        for line in f:
            line = line.strip()
            if line.startswith("DATABASE_URL="):
                DATABASE_URL = line.split("=", 1)[1].strip().strip('"').strip("'")
                break

if not DATABASE_URL:
    DATABASE_URL = os.environ.get("DATABASE_URL", "postgresql://localhost/viddeoxx")


async def run():
    try:
        import asyncpg
    except ImportError:
        print("ERROR: asyncpg not installed. Run: pip install asyncpg")
        sys.exit(1)

    print(f"Connecting to: {DATABASE_URL.split('@')[-1] if '@' in DATABASE_URL else DATABASE_URL}")
    conn = await asyncpg.connect(DATABASE_URL)
    try:
        # 1. Drop therapy_sessions table (stored conversation data — privacy violation)
        result = await conn.execute("DROP TABLE IF EXISTS therapy_sessions CASCADE")
        print("✓ Dropped table: therapy_sessions (IF EXISTS)")

        # 2. Remove user_agent column from perf_metrics (not disclosed, not needed)
        # Check if column exists before attempting drop (safe for repeated runs)
        col_exists = await conn.fetchval(
            """
            SELECT COUNT(*) FROM information_schema.columns
            WHERE table_name = 'perf_metrics' AND column_name = 'user_agent'
            """
        )
        if col_exists:
            await conn.execute("ALTER TABLE perf_metrics DROP COLUMN user_agent")
            print("✓ Dropped column: perf_metrics.user_agent")
        else:
            print("✓ Column perf_metrics.user_agent already absent — nothing to do")

        print("\nMigration complete.")
    finally:
        await conn.close()


if __name__ == "__main__":
    asyncio.run(run())
