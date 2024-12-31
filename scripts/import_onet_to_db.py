import json
import pandas as pd
import logging
from pathlib import Path
import os
from typing import Dict, List
import psycopg2
from psycopg2.extras import execute_values

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
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
    """Import the CSV data into PostgreSQL database."""
    logger.info("Starting database import...")

    try:
        # Read occupation data CSV
        logger.info("Reading occupation data file...")
        occupations_df = pd.read_csv('attached_assets/occupation_data.csv')
        logger.info(f"Found {len(occupations_df)} occupations")

        conn = get_db_connection()
        cur = conn.cursor()

        try:
            # Extract and import major groups
            logger.info("Importing major groups...")
            major_groups = []
            for code in occupations_df['onetsoc_code'].str[:2].unique():
                # Get the first occupation in this major group
                sample_occ = occupations_df[occupations_df['onetsoc_code'].str.startswith(code)].iloc[0]
                # Create a descriptive title
                title = f"{sample_occ['title'].split(',')[0]} Occupations"
                major_groups.append({
                    'code': code,
                    'title': title,
                    'description': f"Major group for {title.lower()}"
                })

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
            logger.info(f"Imported {len(major_groups)} major groups")

            # Extract and import minor groups
            logger.info("Importing minor groups...")
            minor_groups = []
            for code in occupations_df['onetsoc_code'].str[:4].unique():
                # Get the first occupation in this minor group
                sample_occ = occupations_df[occupations_df['onetsoc_code'].str.startswith(code)].iloc[0]
                # Create a descriptive title
                title = f"{sample_occ['title'].split(',')[0]} Specialists"
                minor_groups.append({
                    'code': code,
                    'title': title,
                    'description': f"Specialized group for {title.lower()}",
                    'major_group_code': code[:2]
                })

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
            logger.info(f"Imported {len(minor_groups)} minor groups")

            # Process and import detailed occupations
            logger.info("Processing detailed occupations...")
            detailed_occupations = []

            for _, row in occupations_df.iterrows():
                soc_code = row['onetsoc_code'].split('.')[0]  # Remove decimal part
                detailed_occupations.append({
                    'code': soc_code,
                    'title': row['title'],
                    'description': row['description'],
                    'minor_group_code': soc_code[:4],
                    'alternative_titles': [],  # Empty list since we don't have alternate titles
                    'skills': [],  # Empty list since we don't have skills data
                    'tasks': []    # Empty list since we don't have tasks data
                })

            logger.info(f"Importing {len(detailed_occupations)} detailed occupations...")
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
                ) for o in detailed_occupations]
            )
            logger.info(f"Imported {len(detailed_occupations)} detailed occupations")

            conn.commit()
            logger.info("Database import completed successfully")

        except Exception as e:
            conn.rollback()
            logger.error(f"Error during import: {e}")
            raise
        finally:
            cur.close()
            conn.close()

    except Exception as e:
        logger.error(f"Failed to process data files: {e}")
        raise

if __name__ == "__main__":
    import_data_to_db()