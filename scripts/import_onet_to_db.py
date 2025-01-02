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

def consolidate_occupation_data(occupations_df: pd.DataFrame, alternative_titles_df: pd.DataFrame) -> List[Dict]:
    """Consolidate occupation data with alternative titles."""
    logger.info("Consolidating occupation data...")

    # Log the columns available in each DataFrame
    logger.info(f"Occupation data columns: {occupations_df.columns.tolist()}")
    logger.info(f"Alternative titles columns: {alternative_titles_df.columns.tolist()}")

    # Group alternative titles by O*NET-SOC code
    alt_titles_by_code = {}
    for code, group in alternative_titles_df.groupby('onetsoc_code'):
        alt_titles_by_code[code] = group['alternate_title'].tolist()

    # Process each unique SOC code only once
    consolidated_data = []
    processed_soc_codes = set()

    for _, row in occupations_df.iterrows():
        soc_code = row['onetsoc_code'].split('.')[0]  # Remove decimal part if present

        # Skip if we've already processed this SOC code
        if soc_code in processed_soc_codes:
            continue

        processed_soc_codes.add(soc_code)

        # Get alternative titles for this occupation
        alt_titles = alt_titles_by_code.get(row['onetsoc_code'], [])

        occupation = {
            'code': soc_code,
            'title': row['title'],
            'description': row.get('description', ''),
            'minor_group_code': soc_code[:4],
            'alternative_titles': alt_titles
        }
        consolidated_data.append(occupation)

    logger.info(f"Consolidated {len(consolidated_data)} occupations with their alternative titles")
    return consolidated_data

def import_data_to_db():
    """Import the CSV data into PostgreSQL database."""
    logger.info("Starting database import...")

    try:
        # Read CSV files from attached_assets
        logger.info("Reading data files...")
        occupations_df = pd.read_csv('attached_assets/occupation_data.csv')
        alternative_titles_df = pd.read_csv('attached_assets/alternate_titles.csv')

        logger.info(f"Found {len(occupations_df)} occupations")
        logger.info(f"Found {len(alternative_titles_df)} alternative titles")

        # Consolidate data
        consolidated_occupations = consolidate_occupation_data(
            occupations_df,
            alternative_titles_df
        )

        conn = get_db_connection()
        cur = conn.cursor()

        try:
            # Extract and import major groups
            logger.info("Importing major groups...")
            major_groups = []
            for code in sorted(set(occupations_df['onetsoc_code'].str[:2])):
                sample_occ = occupations_df[occupations_df['onetsoc_code'].str.startswith(code)].iloc[0]
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
            for code in sorted(set(occupations_df['onetsoc_code'].str[:4])):
                sample_occ = occupations_df[occupations_df['onetsoc_code'].str.startswith(code)].iloc[0]
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

            # Import detailed occupations first without search vector
            logger.info(f"Importing {len(consolidated_occupations)} detailed occupations...")
            execute_values(
                cur,
                """
                INSERT INTO soc_detailed_occupations 
                (code, title, description, minor_group_code, alternative_titles)
                VALUES %s
                ON CONFLICT (code) DO UPDATE SET
                    title = EXCLUDED.title,
                    description = EXCLUDED.description,
                    minor_group_code = EXCLUDED.minor_group_code,
                    alternative_titles = EXCLUDED.alternative_titles
                """,
                [(
                    o['code'],
                    o['title'],
                    o['description'],
                    o['minor_group_code'],
                    o['alternative_titles']
                ) for o in consolidated_occupations]
            )

            # Update search vectors separately
            cur.execute("""
                UPDATE soc_detailed_occupations
                SET search_vector = to_tsvector('english',
                    title || ' ' ||
                    COALESCE(description, '') || ' ' ||
                    COALESCE(array_to_string(alternative_titles, ' '), '')
                );
            """)

            logger.info(f"Successfully imported {len(consolidated_occupations)} detailed occupations")
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