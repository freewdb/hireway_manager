import pandas as pd
import logging

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def rename_csv_columns():
    try:
        # Read the CSV files
        logger.info("Reading occupation data CSV...")
        occ_data = pd.read_csv('attached_assets/occupation_data.csv')
        logger.info(f"Original occupation columns: {', '.join(occ_data.columns)}")

        logger.info("Reading alternate titles CSV...")
        alt_titles = pd.read_csv('attached_assets/alternate_titles.csv')
        logger.info(f"Original alternate titles columns: {', '.join(alt_titles.columns)}")

        # Define column mappings
        occ_columns = {
            'O*NET-SOC Code': 'code',
            'Title': 'title',
            'Description': 'description'
        }

        alt_columns = {
            'O*NET-SOC Code': 'code',
            'Alternate Title': 'title'
        }

        # Rename columns
        occ_data = occ_data.rename(columns=occ_columns)
        alt_titles = alt_titles.rename(columns=alt_columns)

        # Save renamed files
        logger.info("Saving renamed files...")
        occ_data.to_csv('attached_assets/occupation_data.csv', index=False)
        alt_titles.to_csv('attached_assets/alternate_titles.csv', index=False)

        logger.info("Successfully renamed and saved CSV files")
        logger.info(f"New occupation columns: {', '.join(occ_data.columns)}")
        logger.info(f"New alternate titles columns: {', '.join(alt_titles.columns)}")

    except Exception as e:
        logger.error(f"Error processing CSV files: {e}")
        raise

if __name__ == "__main__":
    rename_csv_columns()