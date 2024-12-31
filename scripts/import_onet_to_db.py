import json
from pathlib import Path
import os
import logging
from typing import Dict, List
import psycopg2
from psycopg2.extras import execute_values

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def get_db_connection():
    """Create a database connection using environment variables."""
    return psycopg2.connect(
        dbname=os.environ['PGDATABASE'],
        user=os.environ['PGUSER'],
        password=os.environ['PGPASSWORD'],
        host=os.environ['PGHOST'],
        port=os.environ['PGPORT']
    )

def import_data_to_db():
    """Import the JSON data into PostgreSQL database."""
    logger.info("Starting database import...")

    data_dir = Path('data')
    if not data_dir.exists():
        raise FileNotFoundError("Data directory not found. Run fetch_onet_data.py first.")

    conn = get_db_connection()
    cur = conn.cursor()

    try:
        # Import major groups
        logger.info("Importing major groups...")
        with open(data_dir / 'major_groups.json') as f:
            major_groups = json.load(f)

        execute_values(
            cur,
            """
            INSERT INTO soc_major_groups (code, title, description)
            VALUES %s
            ON CONFLICT (code) DO UPDATE SET
                title = EXCLUDED.title,
                description = EXCLUDED.description
            """,
            [(g['code'], g['title'], g['description']) for g in major_groups]
        )

        # Import minor groups
        logger.info("Importing minor groups...")
        with open(data_dir / 'minor_groups.json') as f:
            minor_groups = json.load(f)

        execute_values(
            cur,
            """
            INSERT INTO soc_minor_groups (code, title, description, major_group_code)
            VALUES %s
            ON CONFLICT (code) DO UPDATE SET
                title = EXCLUDED.title,
                description = EXCLUDED.description,
                major_group_code = EXCLUDED.major_group_code
            """,
            [(g['code'], g['title'], g['description'], g['major_group_code']) 
             for g in minor_groups]
        )

        # Import detailed occupations
        logger.info("Importing detailed occupations...")
        with open(data_dir / 'detailed_occupations.json') as f:
            occupations = json.load(f)

        execute_values(
            cur,
            """
            INSERT INTO soc_detailed_occupations 
            (code, title, description, minor_group_code, alternative_titles, skills, tasks)
            VALUES %s
            ON CONFLICT (code) DO UPDATE SET
                title = EXCLUDED.title,
                description = EXCLUDED.description,
                minor_group_code = EXCLUDED.minor_group_code,
                alternative_titles = EXCLUDED.alternative_titles,
                skills = EXCLUDED.skills,
                tasks = EXCLUDED.tasks
            """,
            [(
                o['code'],
                o['title'],
                o['description'],
                o['minor_group_code'],
                json.dumps(o['alternative_titles']),
                json.dumps(o['skills']),
                json.dumps(o['tasks'])
            ) for o in occupations]
        )

        conn.commit()
        logger.info("Database import completed successfully.")

    except Exception as e:
        conn.rollback()
        logger.error(f"Error during import: {e}")
        raise
    finally:
        cur.close()
        conn.close()

if __name__ == "__main__":
    import_data_to_db()