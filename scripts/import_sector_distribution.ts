
import { readFile } from 'fs/promises';
import { parse } from 'csv-parse/sync';
import { db } from '../db';
import { socSectorDistribution } from '../db/schema';

async function importSectorDistribution() {
  try {
    const startTime = Date.now();
    console.log('Reading sector distribution data...');
    const fileContent = await readFile('attached_assets/occupation_sector_distribution.csv', 'utf-8');
    const records = parse(fileContent, {
      columns: true,
      skip_empty_lines: true
    });

    console.log('Importing sector distribution data...');

    // Clear existing data
    await db.delete(socSectorDistribution);

    // Insert new records
    for (const record of records) {
      await db.insert(socSectorDistribution).values({
        socCode: record.onetsoc_code,
        sectorLabel: record.sector_label,
        sampleSize: parseInt(record.n),
        percentage: parseFloat(record.percent),
        dateUpdated: new Date(record.date_updated).toISOString().split('T')[0]
      });
    }

    const timeElapsed = (Date.now() - startTime) / 1000;
    console.log(`Sector distribution data import complete in ${timeElapsed} seconds`);
    process.exit(0);
  } catch (error) {
    console.error('Error importing sector distribution data:', error);
    process.exit(1);
  }
}

importSectorDistribution().catch(console.error);
