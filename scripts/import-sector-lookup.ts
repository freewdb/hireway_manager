
import { readFile } from 'fs/promises';
import { parse } from 'csv-parse/sync';
import { db } from '../db';
import { sectorLookup } from '../db/schema';

async function importSectorLookup() {
  try {
    console.log('Reading sector lookup data...');
    const fileContent = await readFile('attached_assets/sectorslu.csv', 'utf-8');
    const records = parse(fileContent, {
      columns: true,
      skip_empty_lines: true
    });

    console.log(`Found ${records.length} records to import`);
    console.log('Clearing existing data...');
    await db.delete(sectorLookup);

    const sectors = records.map(record => ({
      naics: record.naics,
      concat: record.concat,
      sector: record.Sector
    }));

    console.log('Inserting sector lookup data...');
    await db.insert(sectorLookup).values(sectors);

    console.log('Sector lookup data import complete');
    process.exit(0);
  } catch (error) {
    console.error('Error importing sector lookup data:', error);
    process.exit(1);
  }
}

importSectorLookup().catch(console.error);
