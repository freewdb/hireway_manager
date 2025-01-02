import subprocess
import sys
import logging

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger(__name__)

def run_script(script_name):
    logger.info(f"Running {script_name}...")
    try:
        result = subprocess.run(
            [sys.executable, f"scripts/{script_name}"],
            capture_output=True,
            text=True,
            check=True
        )
        logger.info(f"{script_name} output:")
        print(result.stdout)
        if result.stderr:
            logger.warning(f"{script_name} warnings:")
            print(result.stderr)
    except subprocess.CalledProcessError as e:
        logger.error(f"Error running {script_name}:")
        print(e.stdout)
        print(e.stderr, file=sys.stderr)
        raise

def main():
    logger.info("Starting O*NET data import process")

    # Import the data directly to the database
    run_script("import_onet_to_db.py")

    logger.info("Data import process completed")

if __name__ == "__main__":
    main()