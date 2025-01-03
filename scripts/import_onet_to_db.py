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
    try:
        conn = psycopg2.connect(
            dbname=os.environ['PGDATABASE'],
            user=os.environ['PGUSER'],
            password=os.environ['PGPASSWORD'],
            host=os.environ['PGHOST'],
            port=os.environ['PGPORT']
        )
        logger.info("Successfully connected to database")
        return conn
    except Exception as e:
        logger.error(f"Failed to connect to database: {e}")
        raise

def preprocess_soc_code(code: str) -> str:
    """Standardize SOC code format."""
    try:
        # Remove any decimal points and ensure proper formatting
        base_code = str(code).replace('.', '')
        if len(base_code) < 7:
            base_code = base_code.ljust(7, '0')
        return base_code
    except Exception as e:
        logger.error(f"Error preprocessing SOC code {code}: {e}")
        raise

def clean_text_for_search(text: str) -> str:
    """Clean text for search vector."""
    if not text:
        return ""
    return str(text).replace("'", "''")

def setup_database_indexes(cur):
    """Create necessary database indexes."""
    try:
        # Create GIN indexes for full-text search
        cur.execute("""
            CREATE INDEX IF NOT EXISTS soc_major_groups_search_idx 
            ON soc_major_groups USING gin(search_vector);

            CREATE INDEX IF NOT EXISTS soc_minor_groups_search_idx 
            ON soc_minor_groups USING gin(search_vector);

            CREATE INDEX IF NOT EXISTS soc_detailed_occupations_search_idx 
            ON soc_detailed_occupations USING gin(search_vector);
        """)
        logger.info("Successfully created database indexes")
    except Exception as e:
        logger.error(f"Failed to create indexes: {e}")
        raise

def import_data():
    """Import the O*NET data into PostgreSQL database."""
    logger.info("Starting data import process...")

    try:
        # Read and validate CSV files
        logger.info("Reading CSV files...")
        try:
            occ_data = pd.read_csv('attached_assets/occupation_data.csv')
            alt_titles = pd.read_csv('attached_assets/alternate_titles.csv')
            logger.info(f"Successfully read {len(occ_data)} occupations and {len(alt_titles)} alternative titles")
        except Exception as e:
            logger.error(f"Failed to read CSV files: {e}")
            raise

        # Create the database connection
        conn = get_db_connection()
        cur = conn.cursor()

        try:
            # Process major groups
            logger.info("Processing major groups...")
            major_groups = []
            for code in sorted(set([str(code)[:2] for code in occ_data['onetsoc_code'] if pd.notna(code)])):
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
            logger.info(f"Inserted {len(major_groups)} major groups")

            # Process minor groups
            logger.info("Processing minor groups...")
            minor_groups = []
            for code in sorted(set([str(code)[:4] for code in occ_data['onetsoc_code'] if pd.notna(code)])):
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
            logger.info(f"Inserted {len(minor_groups)} minor groups")

            # Process detailed occupations
            logger.info("Processing detailed occupations...")

            # Group alternative titles by code
            alt_titles_dict = alt_titles.groupby('onetsoc_code')['alternate_title'].apply(list).to_dict()

            # Process each occupation
            occupations = []
            for _, row in occ_data.iterrows():
                try:
                    code = preprocess_soc_code(str(row['onetsoc_code']))
                    minor_code = str(code)[:4].ljust(7, '0')
                    title = str(row['title'])
                    description = str(row.get('description', ''))

                    # Get alternative titles
                    alt_titles_list = alt_titles_dict.get(row['onetsoc_code'], [])

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
                except Exception as e:
                    logger.error(f"Error processing occupation {row.get('onetsoc_code', 'Unknown')}: {e}")
                    continue

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
            logger.info(f"Inserted {len(occupations)} detailed occupations")

            # Create indexes
            setup_database_indexes(cur)

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