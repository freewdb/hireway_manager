import requests
import json
from pathlib import Path
import os
import logging
from typing import Dict, List, Optional
from dataclasses import dataclass, asdict

# Set up logging with more detailed format
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger(__name__)

@dataclass
class DetailedOccupation:
    code: str
    title: str
    description: str
    alternative_titles: List[str]
    minor_group_code: str
    tasks: List[str]

class OnetDataFetcher:
    ONET_BASE_URL = "https://www.onetcenter.org/dl_files/database/db_29_1_mysql"

    def __init__(self):
        self.occupations: Dict[str, DetailedOccupation] = {}

    def fetch_onet_data(self):
        """Fetch occupation data and alternate titles from O*NET."""
        logger.info("Starting O*NET data fetch process...")

        try:
            # Download the SQL files
            logger.info("Downloading occupation data file...")
            occupation_sql = self._download_file("03_occupation_data.sql")
            logger.info("Successfully downloaded occupation data")

            logger.info("Downloading alternate titles file...")
            alternate_titles_sql = self._download_file("29_alternate_titles.sql")
            logger.info("Successfully downloaded alternate titles")

            # Parse occupation data
            logger.info("Parsing occupation data...")
            self._parse_occupation_data(occupation_sql)
            logger.info(f"Parsed {len(self.occupations)} occupations")

            # Parse alternate titles
            logger.info("Parsing alternate titles...")
            self._parse_alternate_titles(alternate_titles_sql)
            logger.info("Finished parsing alternate titles")

            self.save_to_json()

        except Exception as e:
            logger.error(f"Error during O*NET data fetch: {str(e)}")
            raise

    def _download_file(self, filename: str) -> str:
        """Download a file from O*NET and return its contents."""
        url = f"{self.ONET_BASE_URL}/{filename}"
        logger.info(f"Downloading from {url}")

        try:
            response = requests.get(url)
            response.raise_for_status()
            logger.info(f"Successfully downloaded {filename} ({len(response.text)} bytes)")
            return response.text
        except requests.RequestException as e:
            logger.error(f"Failed to download {filename}: {str(e)}")
            raise

    def _parse_occupation_data(self, sql_content: str):
        """Parse occupation data SQL file."""
        logger.info("Starting occupation data parsing...")
        count = 0

        for line in sql_content.split('\n'):
            if line.startswith('INSERT INTO'):
                try:
                    # Extract values between parentheses
                    values_str = line[line.find('(') + 1:line.rfind(')')]
                    values = [v.strip("'") for v in values_str.split(',')]

                    if len(values) >= 2:  # Ensure we have at least code and title
                        onet_code = values[0].strip()
                        title = values[1].strip()

                        # Convert O*NET code to SOC code (remove .00 suffix)
                        soc_code = onet_code.split('.')[0]

                        # Derive minor group code (first 4 characters of SOC code)
                        minor_group_code = soc_code[:4]

                        self.occupations[onet_code] = DetailedOccupation(
                            code=soc_code,
                            title=title,
                            description="",  # Will be populated later if available
                            alternative_titles=[],  # Will be populated from alternate titles file
                            minor_group_code=minor_group_code,
                            tasks=[]
                        )
                        count += 1
                except Exception as e:
                    logger.error(f"Error parsing line: {line[:100]}... Error: {str(e)}")

        logger.info(f"Finished parsing occupation data. Found {count} occupations")

    def _parse_alternate_titles(self, sql_content: str):
        """Parse alternate titles SQL file."""
        logger.info("Starting alternate titles parsing...")
        alt_title_count = 0

        for line in sql_content.split('\n'):
            if line.startswith('INSERT INTO'):
                try:
                    # Extract values between parentheses
                    values_str = line[line.find('(') + 1:line.rfind(')')]
                    values = [v.strip("'") for v in values_str.split(',')]

                    if len(values) >= 2:  # Ensure we have at least code and title
                        onet_code = values[0].strip()
                        alt_title = values[1].strip()

                        if onet_code in self.occupations:
                            self.occupations[onet_code].alternative_titles.append(alt_title)
                            alt_title_count += 1

                except Exception as e:
                    logger.error(f"Error parsing alternate title line: {line[:100]}... Error: {str(e)}")

        logger.info(f"Finished parsing alternate titles. Added {alt_title_count} alternate titles")

    def save_to_json(self, output_dir: str = 'data'):
        """Save fetched data to JSON files."""
        logger.info("Saving data to JSON...")
        Path(output_dir).mkdir(exist_ok=True)

        # Convert occupations to list and sort by code
        occupations_list = sorted(
            self.occupations.values(),
            key=lambda x: x.code
        )

        output_file = f'{output_dir}/detailed_occupations.json'
        with open(output_file, 'w') as f:
            json.dump([asdict(o) for o in occupations_list], f, indent=2)

        logger.info(f"Saved {len(occupations_list)} occupations to {output_file}")

def import_full_onet_data():
    """Main function to import O*NET data."""
    logger.info("Starting O*NET data import process...")

    try:
        fetcher = OnetDataFetcher()
        fetcher.fetch_onet_data()
        logger.info("O*NET data import completed successfully.")
    except Exception as e:
        logger.error(f"Failed to import O*NET data: {str(e)}")
        raise

if __name__ == "__main__":
    import_full_onet_data()