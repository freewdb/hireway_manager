import { sql } from 'drizzle-orm';
import { db } from '../../../db';
import { socDetailedOccupations, socSectorDistribution, sectorLookup } from '../../../db/schema';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const sector = url.searchParams.get('sector');

    if (!sector) {
      return Response.json([]);
    }

    const topOccupations = await db
      .select({
        code: socDetailedOccupations.code,
        title: socDetailedOccupations.title,
        description: socDetailedOccupations.description,
        sectorDistribution: sql<number>`
          COALESCE((
            SELECT percentage 
            FROM ${socSectorDistribution} sd
            WHERE sd.soc_code = ${socDetailedOccupations.code}
            AND sd.sector_label = ${`NAICS${sector}`}
          ), 0)`.as('sector_distribution')
      })
      .from(socDetailedOccupations)
      .orderBy(sql`sector_distribution DESC`)
      .limit(10);

    return Response.json(topOccupations);
  } catch (error) {
    console.error('Error fetching top occupations:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}