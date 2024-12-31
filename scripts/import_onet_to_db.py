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

def import_industry_data(cur):
    """Import initial industry data."""
    logger.info("Importing industry data...")
    industries = [
        ("Information Technology", "51", "Computer systems and software services", "Tech & Software"),
        ("Healthcare", "62", "Healthcare services and facilities", "Healthcare & Medical"),
        ("Manufacturing", "31-33", "Manufacturing and production", "Manufacturing"),
        ("Finance", "52", "Financial services and banking", "Finance & Banking"),
        ("Retail", "44-45", "Retail trade", "Retail & Commerce"),
        ("Education", "61", "Educational services", "Education & Training"),
        ("Construction", "23", "Construction and building", "Construction & Building"),
        ("Professional Services", "54", "Professional and technical services", "Professional Services"),
    ]

    execute_values(
        cur,
        """
        INSERT INTO industries (name, naics_code, description, display_name)
        VALUES %s
        ON CONFLICT (naics_code) DO UPDATE SET
            name = EXCLUDED.name,
            description = EXCLUDED.description,
            display_name = EXCLUDED.display_name
        """,
        industries
    )
    logger.info(f"Imported {len(industries)} industries")

def import_data_to_db():
    """Import the CSV data into PostgreSQL database."""
    logger.info("Starting database import...")

    try:
        # Read CSV files
        logger.info("Reading occupation data files...")
        occupations_df = pd.read_csv('attached_assets/occupation_data.csv')
        alt_titles_df = pd.read_csv('attached_assets/alternate_titles.csv')
        metadata_df = pd.read_csv('attached_assets/occupation_level_metadata.csv')

        logger.info(f"Found {len(occupations_df)} occupations")
        logger.info(f"Found {len(alt_titles_df)} alternative titles")

        conn = get_db_connection()
        cur = conn.cursor()

        try:
            # First import industries
            import_industry_data(cur)

            # Extract and import major groups
            logger.info("Importing major groups...")
            major_groups = []
            for code in occupations_df['onetsoc_code'].str[:2].unique():
                title = occupations_df[occupations_df['onetsoc_code'].str.startswith(code)]['title'].iloc[0]
                major_groups.append({
                    'code': code,
                    'title': f"{title.split(',')[0]} Group",
                    'description': None
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

            # Extract and import minor groups
            logger.info("Importing minor groups...")
            minor_groups = []
            for code in occupations_df['onetsoc_code'].str[:4].unique():
                title = occupations_df[occupations_df['onetsoc_code'].str.startswith(code)]['title'].iloc[0]
                minor_groups.append({
                    'code': code,
                    'title': f"{title.split(',')[0]} Subgroup",
                    'description': None,
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

            # Process and import detailed occupations
            logger.info("Processing detailed occupations...")
            detailed_occupations = []

            for _, row in occupations_df.iterrows():
                soc_code = row['onetsoc_code'].split('.')[0]  # Remove decimal part
                alt_titles = alt_titles_df[alt_titles_df['onetsoc_code'] == row['onetsoc_code']]['title'].tolist()

                detailed_occupations.append({
                    'code': soc_code,
                    'title': row['title'],
                    'description': row['description'],
                    'minor_group_code': soc_code[:4],
                    'alternative_titles': alt_titles,
                    'skills': [],  # Can be populated later if we have skills data
                    'tasks': []    # Can be populated later if we have tasks data
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