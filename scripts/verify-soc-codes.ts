
import { db } from '../db';
import { sql } from 'drizzle-orm';
import { socDetailedOccupations, socSectorDistribution } from '../db/schema';

async function verifySOCCodes() {
  console.log('Running detailed diagnostics...');
  
  // Check exact row in sector distribution
  const distributionCheck = await db.execute(sql`
    SELECT * FROM soc_sector_distribution 
    WHERE soc_code = '47-5041.00' 
    AND sector_label = 'NAICS21';
  `);
  console.log('Distribution check:', distributionCheck.rows);

  // Check if code exists in occupations table
  const occupationCheck = await db.execute(sql`
    SELECT code, title FROM soc_detailed_occupations 
    WHERE code = '47-5041.00';
  `);
  console.log('Occupation check:', occupationCheck.rows);

  // Check all sector distributions for this occupation
  const allDistributions = await db.execute(sql`
    SELECT soc_code, sector_label, percentage 
    FROM soc_sector_distribution 
    WHERE soc_code = '47-5041.00'
    ORDER BY percentage DESC;
  `);
  console.log('All distributions:', allDistributions.rows);
}

verifySOCCodes().catch(console.error);
