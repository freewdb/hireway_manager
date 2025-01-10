
import { sql } from 'drizzle-orm';
import { db } from '../../../db';
import { socDetailedOccupations, socSectorDistribution } from '../../../db/schema';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const sector = url.searchParams.get('sector');

    if (!sector) {
      return new Response(JSON.stringify([]), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const sectorLabel = `NAICS${sector}`;
    
    const topOccupations = await db
      .select({
        code: socDetailedOccupations.code,
        title: socDetailedOccupations.title,
        description: socDetailedOccupations.description,
        alternativeTitles: socDetailedOccupations.alternativeTitles,
        distribution: sql<number>`
          COALESCE((
            SELECT percentage 
            FROM ${socSectorDistribution} 
            WHERE soc_code = ${socDetailedOccupations.code}
            AND sector_label = ${sectorLabel}
          ), 0)`.as('sector_distribution')
      })
      .from(socDetailedOccupations)
      .where(sql`
        EXISTS (
          SELECT 1 FROM ${socSectorDistribution}
          WHERE ${socSectorDistribution.socCode} = ${socDetailedOccupations.code}
          AND sector_label = ${sectorLabel}
          AND ${socSectorDistribution.percentage} > 0
        )
      `)
      .orderBy(sql`sector_distribution DESC`)
      .limit(10);

    // Ensure we have valid data before sending response
    const response = topOccupations?.length ? topOccupations : [];
    
    return new Response(JSON.stringify(response), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error fetching top occupations:', error);
    // Return empty array on error to prevent client-side parsing issues
    return new Response(JSON.stringify([]), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
