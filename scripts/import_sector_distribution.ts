import { readFile } from 'fs/promises';
import { parse } from 'csv-parse/sync';
import { db } from '../db';
import { socSectorDistribution } from '../db/schema';

async function importSectorDistribution() {
  try {
    const startTime = Date.now();
    console.log('Reading sector distribution data...');
    const fileContent = await readFile('occupation_sector_distribution2.csv', 'utf-8');
    const records = parse(fileContent, {
      columns: true,
      skip_empty_lines: true
    });

    console.log(`Found ${records.length} records to import`);
    console.log('Clearing existing data...');
    await db.delete(socSectorDistribution);

    // Process in batches of 100
    const BATCH_SIZE = 100;
    let processed = 0;
    const batches = [];

    for (let i = 0; i < records.length; i += BATCH_SIZE) {
      const batch = records.slice(i, i + BATCH_SIZE)
        .filter(record => record.sector && parseFloat(record.percent)) // Skip records with no sector or invalid percentage
        .map(record => ({
          socCode: record.onetsoc_code,
          sectorLabel: record.sector,
          percentage: parseFloat(record.percent)
        }));
      if (batch.length > 0) {
        batches.push(batch);
      }
    }

    console.log(`Processing ${batches.length} batches...`);

    for (const batch of batches) {
      await db.insert(socSectorDistribution).values(batch);
      processed += batch.length;
      console.log(`Processed ${processed}/${records.length} records`);
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