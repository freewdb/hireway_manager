import { eq, sql, and, or, desc, ilike } from 'drizzle-orm';
import { db } from '../../../db';
import { socDetailedOccupations, socMajorGroups, socMinorGroups, socSectorDistribution } from '../../../db/schema';
import type { JobTitleSearchResult } from '../../../db/schema';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const query = url.searchParams.get('search')?.trim() || '';
    const sector = url.searchParams.get('sector')?.trim();

    if (!query || query.length < 2) {
      return new Response(JSON.stringify({ items: [] }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const results = await db
      .select({
        code: socDetailedOccupations.code,
        title: socDetailedOccupations.title,
        description: socDetailedOccupations.description,
        alternativeTitles: socDetailedOccupations.alternativeTitles,
        sectorDistribution: sql<number>`
          COALESCE(
            (
              SELECT percentage::numeric
              FROM ${socSectorDistribution}
              WHERE soc_code = ${socDetailedOccupations.code}
              AND sector_label = ${sector ? `NAICS${sector}` : sql`NULL`}
            ),
            0
          )
        `.as('sector_distribution')
      })
      .from(socDetailedOccupations)
      .where(
        or(
          ilike(socDetailedOccupations.title, `%${query}%`),
          sql`${socDetailedOccupations.alternativeTitles}::text[] && ARRAY[${query}]::text[]`
        )
      )
      .limit(25);

    return new Response(JSON.stringify(results), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in search:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}