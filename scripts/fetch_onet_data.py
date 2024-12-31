import requests
import pandas as pd
from bs4 import BeautifulSoup
import json
from pathlib import Path
import os
from typing import Dict, List, Optional
from dataclasses import dataclass, asdict
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@dataclass
class DetailedOccupation:
    code: str
    title: str
    description: str
    alternative_titles: List[str]
    minor_group_code: str
    skills: List[Dict[str, str]]
    tasks: List[str]

@dataclass
class MinorGroup:
    code: str
    title: str
    description: str
    major_group_code: str

@dataclass
class MajorGroup:
    code: str
    title: str
    description: str

class OnetDataFetcher:
    BASE_URL = "https://www.onetonline.org"

    def __init__(self):
        self.session = requests.Session()
        self.major_groups: Dict[str, MajorGroup] = {}
        self.minor_groups: Dict[str, MinorGroup] = {}
        self.detailed_occupations: Dict[str, DetailedOccupation] = {}

    def fetch_soc_structure(self):
        """Fetch the complete SOC hierarchy structure."""
        logger.info("Fetching SOC structure...")

        response = self.session.get(f"{self.BASE_URL}/find/all")
        soup = BeautifulSoup(response.text, 'lxml')

        # Process major groups
        major_groups = soup.find_all('div', class_='aw-soc-major')
        for major in major_groups:
            major_code = major.find('span', class_='aw-soc2').text.strip()
            major_title = major.find('span', class_='aw-soc3').text.strip()

            self.major_groups[major_code] = MajorGroup(
                code=major_code,
                title=major_title,
                description=self._fetch_group_description(major_code)
            )

            # Process minor groups within this major group
            minor_groups = major.find_all('div', class_='aw-soc-minor')
            for minor in minor_groups:
                minor_code = minor.find('span', class_='aw-soc2').text.strip()
                minor_title = minor.find('span', class_='aw-soc3').text.strip()

                self.minor_groups[minor_code] = MinorGroup(
                    code=minor_code,
                    title=minor_title,
                    description=self._fetch_group_description(minor_code),
                    major_group_code=major_code
                )

                # Process detailed occupations within this minor group
                occupations = minor.find_all('div', class_='aw-soc-detailed')
                for occ in occupations:
                    occ_code = occ.find('span', class_='aw-soc2').text.strip()
                    occ_title = occ.find('span', class_='aw-soc3').text.strip()

                    detailed_data = self._fetch_occupation_details(occ_code)
                    self.detailed_occupations[occ_code] = DetailedOccupation(
                        code=occ_code,
                        title=occ_title,
                        description=detailed_data.get('description', ''),
                        alternative_titles=detailed_data.get('alternative_titles', []),
                        minor_group_code=minor_code,
                        skills=detailed_data.get('skills', []),
                        tasks=detailed_data.get('tasks', [])
                    )

    def _fetch_group_description(self, code: str) -> str:
        """Fetch description for a SOC group."""
        try:
            response = self.session.get(f"{self.BASE_URL}/find/family?f={code}")
            soup = BeautifulSoup(response.text, 'lxml')
            description = soup.find('div', class_='report-description')
            return description.text.strip() if description else ''
        except Exception as e:
            logger.error(f"Error fetching description for {code}: {e}")
            return ''

    def _fetch_occupation_details(self, code: str) -> Dict:
        """Fetch detailed information for a specific occupation."""
        try:
            response = self.session.get(f"{self.BASE_URL}/occupation/{code}")
            soup = BeautifulSoup(response.text, 'lxml')

            details = {
                'description': '',
                'alternative_titles': [],
                'skills': [],
                'tasks': []
            }

            # Get description
            desc = soup.find('div', class_='report-description')
            if desc:
                details['description'] = desc.text.strip()

            # Get alternative titles
            alt_titles = soup.find('div', id='AlternativeTitles')
            if alt_titles:
                details['alternative_titles'] = [
                    title.text.strip() 
                    for title in alt_titles.find_all('span', class_='title')
                ]

            # Get tasks
            tasks = soup.find('div', id='Tasks')
            if tasks:
                details['tasks'] = [
                    task.text.strip() 
                    for task in tasks.find_all('span', class_='task')
                ]

            # Get skills
            skills = soup.find('div', id='Skills')
            if skills:
                details['skills'] = [
                    {
                        'name': skill.find('span', class_='name').text.strip(),
                        'description': skill.find('span', class_='description').text.strip()
                    }
                    for skill in skills.find_all('div', class_='skill')
                ]

            return details
        except Exception as e:
            logger.error(f"Error fetching details for {code}: {e}")
            return {}

    def save_to_json(self, output_dir: str = 'data'):
        """Save fetched data to JSON files."""
        Path(output_dir).mkdir(exist_ok=True)

        with open(f'{output_dir}/major_groups.json', 'w') as f:
            json.dump([asdict(g) for g in self.major_groups.values()], f, indent=2)

        with open(f'{output_dir}/minor_groups.json', 'w') as f:
            json.dump([asdict(g) for g in self.minor_groups.values()], f, indent=2)

        with open(f'{output_dir}/detailed_occupations.json', 'w') as f:
            json.dump([asdict(o) for o in self.detailed_occupations.values()], f, indent=2)

def import_full_onet_data():
    """Main function to import O*NET data."""
    logger.info("Starting O*NET data import...")

    fetcher = OnetDataFetcher()
    fetcher.fetch_soc_structure()
    fetcher.save_to_json()

    logger.info("O*NET data import completed successfully.")

if __name__ == "__main__":
    import_full_onet_data()