
import { db } from '../db';
import { sql } from 'drizzle-orm';
import { socDetailedOccupations, socSectorDistribution } from '../db/schema';

async function verifySOCCodes() {
  console.log('Checking SOC code "47-5041.00" in both tables...');
  
  // Check all distributions for this code
  const distributions = await db.select()
    .from(socSectorDistribution)
    .where(sql`${socSectorDistribution.socCode} = '47-5041.00'`);

  console.log('All sector distributions for 47-5041.00:', distributions);

  // Check if the original code exists
  const occupation = await db.select()
    .from(socDetailedOccupations)
    .where(sql`${socDetailedOccupations.code} = '47-5041.00'`);

  console.log('Detailed occupation record:', occupation);

  console.log('Detailed Occupation:', occupation);
  console.log('Sector Distribution:', distribution);
}

verifySOCCodes().catch(console.error);
