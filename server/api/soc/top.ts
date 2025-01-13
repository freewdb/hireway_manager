
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
        sectorDistribution: sql<number>`
          COALESCE(
            (
              SELECT percentage::numeric 
              FROM ${socSectorDistribution} sd
              INNER JOIN ${sectorLookup} sl ON sl.concat = sd.sector_label
              WHERE sd.soc_code = ${socDetailedOccupations.code}
              AND sl.naics = ${sector}
              LIMIT 1
            ),
            0
          )
        `.as('sector_distribution')
      })
      .from(socDetailedOccupations)
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
