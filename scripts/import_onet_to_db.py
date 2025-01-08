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

def extract_soc_components(code: str) -> tuple:
    """Extract major, minor, and detailed components from SOC code."""
    # Extract base code before decimal
    base_code = code.split('.')[0]
    clean_base = ''.join(c for c in base_code if c.isdigit())
    
    # Keep the decimal part if it exists
    decimal_part = code.split('.')[-1] if '.' in code else '00'
    
    if len(clean_base) < 4:
        clean_base = clean_base.ljust(4, '0')
    
    major_code = f"{clean_base[:2]}-0000"
    minor_code = f"{clean_base[:2]}-{clean_base[2:4]}00"
    detailed_code = f"{clean_base[:2]}-{clean_base[2:4]}{decimal_part}"

    return major_code, minor_code, detailed_code

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
            # Process major groups first
            logger.info("Processing major groups...")
            major_groups = set()
            for code in occ_data['onetsoc_code']:
                major_code, _, _ = extract_soc_components(code)
                major_groups.add((
                    major_code,
                    f"Major Group {major_code[:2]}",
                    f"SOC Major Group {major_code[:2]}"
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
                list(major_groups)
            )
            logger.info(f"Inserted {len(major_groups)} major groups")

            # Process minor groups
            logger.info("Processing minor groups...")
            minor_groups = set()
            for code in occ_data['onetsoc_code']:
                major_code, minor_code, _ = extract_soc_components(code)
                minor_groups.add((
                    minor_code,
                    major_code,
                    f"Minor Group {minor_code[:2]}-{minor_code[3:5]}",
                    f"SOC Minor Group {minor_code[:2]}-{minor_code[3:5]}"
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
                list(minor_groups)
            )
            logger.info(f"Inserted {len(minor_groups)} minor groups")

            # Process alternative titles
            logger.info("Processing alternative titles...")
            alt_titles_dict = {}
            for _, row in alt_titles.iterrows():
                code = str(row['onetsoc_code'])
                if code not in alt_titles_dict:
                    alt_titles_dict[code] = []
                alt_titles_dict[code].append(str(row['alternate_title']))

            # Process detailed occupations with alternative titles
            logger.info("Processing detailed occupations...")
            occupations = []
            seen_codes = set()  # Track unique detailed codes

            # First, process main occupations
            for _, row in occ_data.iterrows():
                try:
                    code = str(row['onetsoc_code'])
                    _, minor_code, detailed_code = extract_soc_components(code)

                    # Skip if we've already processed this detailed code
                    if detailed_code in seen_codes:
                        logger.warning(f"Skipping duplicate detailed code: {detailed_code}")
                        continue

                    seen_codes.add(detailed_code)
                    title = str(row['title'])
                    description = str(row['description'])
                    alt_titles_list = alt_titles_dict.get(code, [])

                    # Create searchable text
                    searchable_text = f"{title} {' '.join(alt_titles_list)} {description}"

                    occupations.append((
                        detailed_code,
                        title,
                        description,
                        minor_code,
                        alt_titles_list,
                        searchable_text
                    ))

                except Exception as e:
                    logger.error(f"Error processing occupation {code}: {e}")
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