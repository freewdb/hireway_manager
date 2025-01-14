
import { eq, sql } from 'drizzle-orm';
import { db } from '../../../db';
import { socDetailedOccupations, socSectorDistribution } from '../../../db/schema';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const sector = url.searchParams.get('sector');

    if (!sector) {
      return new Response(JSON.stringify({ error: 'Sector parameter is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const sectorLabel = `NAICS${sector}`;
    
    console.log('Fetching top occupations:', {
      sector,
      sectorLabel,
      query: 'SELECT TOP 10 FROM soc_detailed_occupations WITH SECTOR DISTRIBUTION'
    });

    const topOccupations = await db
      .select({
        code: socDetailedOccupations.code,
        title: socDetailedOccupations.title,
        description: socDetailedOccupations.description,
        sectorDistribution: sql<number>`
          COALESCE(
            (SELECT percentage::numeric
             FROM ${socSectorDistribution}
             WHERE soc_code = ${socDetailedOccupations.code}
             AND sector_label = ${sectorLabel}
            ),
            0
          )`.as('sector_distribution')
      })
      .from(socDetailedOccupations)
      .where(sql`
        EXISTS (
          SELECT 1
          FROM ${socSectorDistribution}
          WHERE soc_code = ${socDetailedOccupations.code}
          AND sector_label = ${sectorLabel}
        )
      `)
      .orderBy(sql`sector_distribution DESC`)
      .limit(10);

    console.log('Top occupations found:', {
      count: topOccupations.length,
      first: topOccupations[0],
      sector: sectorLabel
    });

    return new Response(JSON.stringify(topOccupations), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error in top occupations endpoint:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
