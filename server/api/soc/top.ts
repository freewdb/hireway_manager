import { sql } from 'drizzle-orm';
import { db } from '../../../db';
import { socDetailedOccupations, socSectorDistribution, sectorLookup } from '../../../db/schema';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const sector = url.searchParams.get('sector');

    if (!sector) {
      return new Response(JSON.stringify([]), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const topOccupations = await db
      .select({
        code: socDetailedOccupations.code,
        title: socDetailedOccupations.title,
        description: socDetailedOccupations.description,
        distribution: sql<number>`
          COALESCE((
            SELECT percentage 
            FROM ${socSectorDistribution} 
            WHERE soc_code = ${socDetailedOccupations.code}
            AND sector_label = ${sectorLookup.concat}
          ), 0)`.as('sector_distribution')
      })
      .from(socDetailedOccupations)
      .innerJoin(
        socSectorDistribution,
        sql`${socSectorDistribution.socCode} = ${socDetailedOccupations.code}`
      )
      .innerJoin(
        sectorLookup,
        sql`${sectorLookup.naics} = ${sector}`
      )
      .where(sql`${socSectorDistribution.sectorLabel} = ${sectorLookup.concat}`)
      .where(sql`${socSectorDistribution.percentage} > 1.0`)
      .orderBy(sql`sector_distribution DESC`)
      .limit(10);

    return new Response(JSON.stringify(topOccupations), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error fetching top occupations:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}