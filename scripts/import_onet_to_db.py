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
    """Standardize SOC code format to XX-XXXX format."""
    try:
        # Remove any non-numeric characters
        clean_code = ''.join(filter(str.isdigit, str(code)))

        # Ensure we have at least 6 digits
        if len(clean_code) < 6:
            clean_code = clean_code.ljust(6, '0')

        # Format as XX-XXXX
        return f"{clean_code[:2]}-{clean_code[2:6]}"
    except Exception as e:
        logger.error(f"Error preprocessing SOC code {code}: {e}")
        raise

def import_data():
    """Import the O*NET data into PostgreSQL database."""
    logger.info("Starting data import process...")

    try:
        # Read CSV files
        logger.info("Reading CSV files...")
        occ_data = pd.read_csv('attached_assets/occupation_data.csv')
        alt_titles = pd.read_csv('attached_assets/alternate_titles.csv')
        logger.info(f"Successfully read {len(occ_data)} occupations and {len(alt_titles)} alternative titles")

        # Create database connection
        conn = get_db_connection()
        cur = conn.cursor()

        try:
            # Process major groups first (XX-0000)
            logger.info("Processing major groups...")
            major_groups = []
            major_codes = sorted(set([str(code)[:2] for code in occ_data['onetsoc_code'] if pd.notna(code)]))

            for code in major_codes:
                major_code = f"{code}-0000"
                title = f"Major Group {code}"
                description = f"SOC Major Group {code}"
                major_groups.append((
                    major_code,
                    title,
                    description
                ))

            # Insert major groups
            execute_values(
                cur,
                """
                INSERT INTO soc_major_groups (code, title, description)
                VALUES %s
                ON CONFLICT (code) DO UPDATE SET
                    title = EXCLUDED.title,
                    description = EXCLUDED.description
                """,
                major_groups
            )
            logger.info(f"Inserted {len(major_groups)} major groups")

            # Process minor groups (XX-XX00)
            logger.info("Processing minor groups...")
            minor_groups = []
            minor_codes = sorted(set([f"{str(code)[:2]}-{str(code)[2:4]}00" 
                               for code in occ_data['onetsoc_code'] if pd.notna(code)]))

            for code in minor_codes:
                major_code = f"{code[:2]}-0000"
                title = f"Minor Group {code}"
                description = f"SOC Minor Group {code}"
                minor_groups.append((
                    code,
                    major_code,
                    title,
                    description
                ))

            # Insert minor groups
            execute_values(
                cur,
                """
                INSERT INTO soc_minor_groups (code, major_group_code, title, description)
                VALUES %s
                ON CONFLICT (code) DO UPDATE SET
                    major_group_code = EXCLUDED.major_group_code,
                    title = EXCLUDED.title,
                    description = EXCLUDED.description
                """,
                minor_groups
            )
            logger.info(f"Inserted {len(minor_groups)} minor groups")

            # Group alternative titles by code
            logger.info("Processing alternative titles...")
            alt_titles_dict = {}
            for _, row in alt_titles.iterrows():
                code = str(row['onetsoc_code'])
                if code not in alt_titles_dict:
                    alt_titles_dict[code] = []
                alt_titles_dict[code].append(str(row['alternate_title']))

            # Process detailed occupations
            logger.info("Processing detailed occupations...")
            occupations = []
            for _, row in occ_data.iterrows():
                try:
                    raw_code = str(row['onetsoc_code'])
                    code = preprocess_soc_code(raw_code)
                    minor_code = f"{code[:2]}-{code[3:5]}00"

                    title = str(row['title'])
                    description = str(row.get('description', ''))
                    alt_titles_list = alt_titles_dict.get(raw_code, [])

                    # Create searchable text
                    searchable_text = f"{title} {' '.join(alt_titles_list)} {description}"

                    occupations.append((
                        code,
                        title,
                        description,
                        minor_code,
                        alt_titles_list,
                        searchable_text
                    ))
                except Exception as e:
                    logger.error(f"Error processing occupation {raw_code}: {e}")
                    continue

            # Insert detailed occupations
            execute_values(
                cur,
                """
                INSERT INTO soc_detailed_occupations 
                (code, title, description, minor_group_code, alternative_titles, searchable_text)
                VALUES %s
                ON CONFLICT (code) DO UPDATE SET
                    title = EXCLUDED.title,
                    description = EXCLUDED.description,
                    minor_group_code = EXCLUDED.minor_group_code,
                    alternative_titles = EXCLUDED.alternative_titles,
                    searchable_text = EXCLUDED.searchable_text
                """,
                occupations
            )
            logger.info(f"Inserted {len(occupations)} detailed occupations")

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