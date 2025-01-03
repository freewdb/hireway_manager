import pandas as pd
import logging
import os
from typing import Dict, List
import psycopg2
from psycopg2.extras import execute_values

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
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

def preprocess_soc_code(code: str) -> str:
    """Standardize SOC code format."""
    # Remove any decimal points and ensure proper formatting
    base_code = code.replace('.', '')
    if len(base_code) < 7:
        base_code = base_code.ljust(7, '0')
    return base_code

def clean_text_for_search(text: str) -> str:
    """Clean text for search vector."""
    return text.replace("'", "''")

def import_data():
    """Import the O*NET data into PostgreSQL database."""
    logger.info("Starting data import process...")

    try:
        # Read the CSV files from attached_assets directory
        occ_data = pd.read_csv('attached_assets/occupation_data.csv')
        alt_titles = pd.read_csv('attached_assets/alternate_titles.csv')

        logger.info(f"Read {len(occ_data)} occupations and {len(alt_titles)} alternative titles")

        # Create the database connection
        conn = get_db_connection()
        cur = conn.cursor()

        try:
            # Create major groups
            logger.info("Processing major groups...")
            major_groups = []
            for code in sorted(set([code[:2] for code in occ_data['code'] if isinstance(code, str)])):
                major_code = code.ljust(7, '0')
                title = f"Major Group {code}"
                description = f"SOC Major Group {code}"
                major_groups.append((
                    major_code,
                    title,
                    description,
                    f"{clean_text_for_search(title)} {clean_text_for_search(description)}"
                ))

            # Insert major groups
            execute_values(
                cur,
                """
                INSERT INTO soc_major_groups (code, title, description, search_vector)
                VALUES %s
                ON CONFLICT (code) DO UPDATE SET
                    title = EXCLUDED.title,
                    description = EXCLUDED.description,
                    search_vector = to_tsvector('english', EXCLUDED.title || ' ' || COALESCE(EXCLUDED.description, ''))
                """,
                major_groups
            )

            # Create minor groups
            logger.info("Processing minor groups...")
            minor_groups = []
            for code in sorted(set([code[:4] for code in occ_data['code'] if isinstance(code, str)])):
                minor_code = code.ljust(7, '0')
                major_code = code[:2].ljust(7, '0')
                title = f"Minor Group {code}"
                description = f"SOC Minor Group {code}"
                minor_groups.append((
                    minor_code,
                    major_code,
                    title,
                    description,
                    f"{clean_text_for_search(title)} {clean_text_for_search(description)}"
                ))

            # Insert minor groups
            execute_values(
                cur,
                """
                INSERT INTO soc_minor_groups (code, major_group_code, title, description, search_vector)
                VALUES %s
                ON CONFLICT (code) DO UPDATE SET
                    major_group_code = EXCLUDED.major_group_code,
                    title = EXCLUDED.title,
                    description = EXCLUDED.description,
                    search_vector = to_tsvector('english', EXCLUDED.title || ' ' || COALESCE(EXCLUDED.description, ''))
                """,
                minor_groups
            )

            # Process detailed occupations
            logger.info("Processing detailed occupations...")

            # Group alternative titles by code
            alt_titles_dict = alt_titles.groupby('code')['title'].apply(list).to_dict()

            # Process each occupation
            occupations = []
            for _, row in occ_data.iterrows():
                code = preprocess_soc_code(str(row['code']))
                minor_code = code[:4].ljust(7, '0')
                title = row['title']
                description = row.get('description', '')

                # Get alternative titles
                alt_titles_list = alt_titles_dict.get(row['code'], [])

                # Create searchable text combining all relevant fields
                searchable_text = f"{title} {' '.join(alt_titles_list)} {description}"

                occupations.append((
                    code,
                    title,
                    description,
                    minor_code,
                    alt_titles_list,
                    searchable_text,
                    clean_text_for_search(searchable_text)
                ))

            # Insert detailed occupations
            execute_values(
                cur,
                """
                INSERT INTO soc_detailed_occupations 
                (code, title, description, minor_group_code, alternative_titles, searchable_text, search_vector)
                VALUES %s
                ON CONFLICT (code) DO UPDATE SET
                    title = EXCLUDED.title,
                    description = EXCLUDED.description,
                    minor_group_code = EXCLUDED.minor_group_code,
                    alternative_titles = EXCLUDED.alternative_titles,
                    searchable_text = EXCLUDED.searchable_text,
                    search_vector = to_tsvector('english', EXCLUDED.searchable_text)
                """,
                occupations
            )

            conn.commit()
            logger.info("Successfully imported all data")

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
    import_data()