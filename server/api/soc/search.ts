import { eq, sql, and, or, desc, ilike } from 'drizzle-orm';
import { db } from '../../../db';
import { socDetailedOccupations, socMajorGroups, socMinorGroups, socSectorDistribution } from '../../../db/schema';
import type { JobTitleSearchResult } from '../../../db/schema';
import Fuse from 'fuse.js';

interface ConsolidatedJobResult {
  code: string;
  primaryTitle: string;
  title: string; // Added title field for consistency
  description: string | undefined;
  alternativeTitles: string[];
  matchedAlternatives: string[];
  isAlternative: boolean;
  rank: number;
  majorGroup?: {
    code: string;
    title: string;
  };
  minorGroup?: {
    code: string;
    title: string;
  };
  topIndustries?: { sector: string; percentage: number }[];
  sectorDistribution?: number; // Added sectorDistribution
}

interface SearchResponse {
  items: ConsolidatedJobResult[];
  totalCount: number;
  currentPage: number;
  totalPages: number;
  query: string;
}

async function consolidateResults(items: any[], query: string, sector?: string, showAll?: boolean): Promise<ConsolidatedJobResult[]> {
  const SECTOR_FILTER_THRESHOLD = 0.0; // Remove initial threshold to see all results

  let filteredItems = items;
  console.log('Consolidating items:', {
    totalItems: items.length,
    firstItem: items[0],
    sector
  });

  const resultsByCode = new Map<string, ConsolidatedJobResult>();
  const queryLower = query.toLowerCase();

  // Single pass consolidation
  for (const item of filteredItems) {
    if (item.code === '47-5041.00') {
      console.log('Before merging 47-5041.00:', {
        code: item.code,
        distribution: item.sectorDistribution,
        title: item.title,
        primaryTitle: item.primaryTitle
      });
    }

    const matchedAlt = (item.alternativeTitles || []).find(alt =>
      alt.toLowerCase().includes(queryLower) || queryLower.includes(alt.toLowerCase())
    );

    const existing = resultsByCode.get(item.code);
    const primaryTitle = item.primaryTitle;

    console.log('Processing search result:', {
      code: item.code,
      officialTitle: primaryTitle,
      matchedTitle: item.title,
      isAlternative: item.title !== primaryTitle,
      alternativeTitlesCount: item.alternativeTitles?.length || 0,
      sectorDistribution: item.sectorDistribution,
      sector: sector ? `NAICS${sector}` : undefined,
      topIndustries: item.topIndustries,
      matchedAlt: matchedAlt || null
    });

    if (!existing) {
      resultsByCode.set(item.code, {
        code: item.code,
        primaryTitle: primaryTitle,
        title: primaryTitle,
        description: item.description,
        alternativeTitles: item.alternativeTitles || [],
        matchedAlternatives: matchedAlt ? [matchedAlt] : [],
        isAlternative: !!matchedAlt,
        rank: matchedAlt ? 0.9 : 1.0,
        majorGroup: item.majorGroup,
        minorGroup: item.minorGroup,
        topIndustries: item.topIndustries,
        sectorDistribution: item.sectorDistribution
      });
    } else {
      // Merge new data with existing entry
      if (matchedAlt && !existing.matchedAlternatives.includes(matchedAlt)) {
        existing.matchedAlternatives.push(matchedAlt);
        existing.isAlternative = true;
        existing.rank = Math.max(existing.rank, 0.9);
      }

      // Merge alternative titles
      const newAltTitles = item.alternativeTitles || [];
      newAltTitles.forEach(alt => {
        if (!existing.alternativeTitles.includes(alt)) {
          existing.alternativeTitles.push(alt);
        }
      });

      // Always take the highest sector distribution
      if (item.sectorDistribution > (existing.sectorDistribution || 0)) {
        existing.sectorDistribution = item.sectorDistribution;
      }

      // Update top industries if not already set
      if (!existing.topIndustries && item.topIndustries) {
        existing.topIndustries = item.topIndustries;
      }
    }
  }

  items.forEach(async item => {
    const titleLower = item.title.toLowerCase();
    const alternativeTitles = item.alternativeTitles || [];

    // Find which alternative title matched (if any)
    const matchedAlternative = alternativeTitles.find(alt =>
      alt.toLowerCase().includes(queryLower) ||
      queryLower.includes(alt.toLowerCase())
    );

    // Calculate rank based on match type
    let rank = 1.0;

    if (matchedAlternative) {
      rank = 0.9; // Slight penalty for alternative match
    }

    // Apply sector boost if sector is provided
    if (sector && item.sectorDistribution) {
      const distribution = parseFloat(item.sectorDistribution);
      const originalRank = rank;

      if (distribution > 0) {
        // Normalize distribution to 0-100 scale and apply logarithmic boost
        const normalizedDist = Math.min(100, distribution);
        const boost = 1 + (Math.log10(normalizedDist + 1) / Math.log10(101));
        rank *= boost;

        // Extra boost for highly represented occupations
        if (distribution >= 10) {
          rank *= 1.5;
        }
      } else {
        rank *= 0.5; // Significant penalty for occupations not represented in sector
      }
    }

    if (!resultsByCode.has(item.code)) {
      // Get the official title from detailed occupations if this is an alternative match

      resultsByCode.set(item.code, {
        code: item.code,
        primaryTitle: item.primaryTitle,
        title: item.primaryTitle,
        description: item.description || undefined,
        alternativeTitles,
        matchedAlternatives: matchedAlternative ? [matchedAlternative] : [],
        isAlternative: !!matchedAlternative,
        rank,
        majorGroup: item.majorGroup?.code ? {
          code: item.majorGroup.code,
          title: item.majorGroup.title
        } : undefined,
        minorGroup: item.minorGroup?.code ? {
          code: item.minorGroup.code,
          title: item.minorGroup.title
        } : undefined,
        topIndustries: item.topIndustries,
        sectorDistribution: item.sectorDistribution
      });
    } else {
      const existing = resultsByCode.get(item.code)!;
      // Update rank if this match is better
      if (rank > existing.rank) {
        existing.rank = rank;
        existing.matchedAlternatives = matchedAlternative ? [matchedAlternative] : [];
        existing.isAlternative = !!matchedAlternative;
      }

      // Add any new alternative titles
      alternativeTitles.forEach((alt: string) => {
        if (!existing.alternativeTitles.includes(alt)) {
          existing.alternativeTitles.push(alt);
        }
      });
    }
  });

    const results = Array.from(resultsByCode.values());
    
    console.log(
      'Final consolidated array check for 47-5041.00:',
      results.filter(x => x.code === '47-5041.00').map(x => ({
        code: x.code,
        title: x.title,
        primaryTitle: x.primaryTitle,
        distribution: x.sectorDistribution,
        rank: x.rank
      }))
    );

    // Log post-consolidation results for specific codes
    console.log('Post-consolidation results:', 
      results.filter(x => x.code.startsWith('47-5041') || x.code.startsWith('53-7051'))
      .map(x => ({
        code: x.code,
        title: x.title,
        sectorDistribution: x.sectorDistribution,
        rank: x.rank
      }))
    );

    return results
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const query = url.searchParams.get('search')?.trim() || '';
    const rawSector = url.searchParams.get('sector')?.trim();
    const sectorLabel = rawSector ? `NAICS${rawSector}` : null;

    console.log('Search request:', {
      query,
      sector: rawSector,
      alternativeTitles: true, // Flag to show we're checking alt titles
      timestamp: new Date().toISOString()
    });


    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(url.searchParams.get('limit') || '20', 10)));
    const offset = (page - 1) * limit;

    // If no query, return browsable categories
    if (!query || query.length < 2) {
      const majorGroups = await db
        .select({
          code: socMajorGroups.code,
          title: socMajorGroups.title,
          description: socMajorGroups.description,
          minorGroups: sql<any>`
            json_agg(
              json_build_object(
                'code', ${socMinorGroups.code},
                'title', ${socMinorGroups.title},
                'description', ${socMinorGroups.description}
              )
            )`
        })
        .from(socMajorGroups)
        .leftJoin(socMinorGroups, eq(socMajorGroups.code, socMinorGroups.majorGroupCode))
        .groupBy(socMajorGroups.code, socMajorGroups.title, socMajorGroups.description)
        .orderBy(socMajorGroups.code);

      return new Response(JSON.stringify({
        items: majorGroups,
        totalCount: majorGroups.length,
        currentPage: 1,
        totalPages: 1,
        query: ''
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // First try exact match with title and alternative titles
    const exactMatches = await db
      .select({
        code: socDetailedOccupations.code,
        title: socDetailedOccupations.title,
        description: socDetailedOccupations.description,
        alternativeTitles: socDetailedOccupations.alternativeTitles,
        searchableText: socDetailedOccupations.searchableText,
        primaryTitle: socDetailedOccupations.title,
        topIndustries: sql<any[]>`
          SELECT json_agg(
            json_build_object(
              'sector', sector_label,
              'percentage', percentage
            )
          )
          FROM (
            SELECT sector_label, percentage 
            FROM ${socSectorDistribution}
            WHERE soc_code = ${socDetailedOccupations.code}
            ORDER BY percentage DESC 
            LIMIT 3
          ) top`.as('top_industries'),
        sectorDistribution: sql<number>`
          COALESCE(
            (
              SELECT percentage::numeric
              FROM ${socSectorDistribution} sd 
              WHERE sd.soc_code = ${socDetailedOccupations.code}
                AND sd.sector_label = ${sectorLabel}
            ),
            0
          )`.as('sector_distribution'),
        majorGroup: {
          code: socMajorGroups.code,
          title: socMajorGroups.title,
          description: socMajorGroups.description,
        },
        minorGroup: {
          code: socMinorGroups.code,
          title: socMinorGroups.title,
          description: socMinorGroups.description,
        }
      })
      .from(socDetailedOccupations)
      .leftJoin(
        socMinorGroups,
        eq(socDetailedOccupations.minorGroupCode, socMinorGroups.code)
      )
      .leftJoin(
        socMajorGroups,
        eq(socMinorGroups.majorGroupCode, socMajorGroups.code)
      )
      .where(
        or(
          ilike(socDetailedOccupations.title, `%${query}%`),
          sql`${socDetailedOccupations.alternativeTitles}::text[] && ARRAY[${query}]::text[]`,
          sql`to_tsvector('english', ${socDetailedOccupations.searchableText}) @@ plainto_tsquery('english', ${query})`
        )
      )
      .limit(100);

    //Added logging as per the request
    const checkMiningDistribution = await db.select({
      code: socSectorDistribution.socCode,
      label: socSectorDistribution.sectorLabel,
      pct: socSectorDistribution.percentage
    })
    .from(socSectorDistribution)
    .where(
      and(
        eq(socSectorDistribution.socCode, '47-5041.00'),
        eq(socSectorDistribution.sectorLabel, sectorLabel || '')
      )
    );
    console.log('Check DB for 47-5041.00 + NAICS21:', checkMiningDistribution);

    console.log(
      'Exact match results (preview of sectorDistribution):',
      exactMatches
        .filter(x => x.code === '47-5041.00') 
        .map(x => ({
          code: x.code,
          sector: sectorLabel,
          distribution: x.sectorDistribution
        }))
    );


    if (exactMatches.length >= 5) {
      const results = await consolidateResults(exactMatches, query, rawSector);

      const codeFrequency = results.reduce((acc, curr) => {
        acc[curr.code] = (acc[curr.code] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const duplicates = Object.entries(codeFrequency)
        .filter(([_, count]) => count > 1)
        .map(([code, count]) => {
          const matches = results.filter(r => r.code === code);
          return {
            code,
            count,
            titles: matches.map(r => r.primaryTitle)
          };
        });


      const response: SearchResponse = {
        items: results.slice(offset, offset + limit),
        totalCount: results.length,
        currentPage: page,
        totalPages: Math.ceil(results.length / limit),
        query
      };

      return new Response(JSON.stringify(response), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // If not enough exact matches, try fuzzy search
    const potentialMatches = await db
      .select({
        code: socDetailedOccupations.code,
        title: socDetailedOccupations.title,
        description: socDetailedOccupations.description,
        alternativeTitles: socDetailedOccupations.alternativeTitles,
        searchableText: socDetailedOccupations.searchableText,
        sectorDistribution: sectorLabel ? socSectorDistribution.percentage : sql<number>`0`,
        majorGroup: {
          code: socMajorGroups.code,
          title: socMajorGroups.title,
          description: socMajorGroups.description,
        },
        minorGroup: {
          code: socMinorGroups.code,
          title: socMinorGroups.title,
          description: socMinorGroups.description,
        }
      })
      .leftJoin(
        socSectorDistribution,
        and(
          eq(socDetailedOccupations.code, socSectorDistribution.socCode),
          eq(socSectorDistribution.sectorLabel, sectorLabel ? sectorLabel : sql`''`)
        )
      )
      .from(socDetailedOccupations)
      .leftJoin(
        socMinorGroups,
        eq(socDetailedOccupations.minorGroupCode, socMinorGroups.code)
      )
      .leftJoin(
        socMajorGroups,
        eq(socMinorGroups.majorGroupCode, socMajorGroups.code)
      )
      .where(
        sql`similarity(${socDetailedOccupations.searchableText}, ${query}) > 0.1`
      )
      .orderBy(sql`similarity(${socDetailedOccupations.searchableText}, ${query}) DESC`)
      .limit(100);

    const fuse = new Fuse(potentialMatches, {
      keys: [
        { name: 'title', weight: 1 },
        { name: 'alternativeTitles', weight: 0.9 },
        { name: 'description', weight: 0.7 }
      ],
      includeScore: true,
      threshold: query.length <= 3 ? 0.3 : 0.5,
      ignoreLocation: true,
      useExtendedSearch: true
    });

    const fuseResults = fuse.search(query);
    const results = await consolidateResults(fuseResults.map(r => r.item), query, rawSector);

    const codeFrequency = results.reduce((acc, curr) => {
      acc[curr.code] = (acc[curr.code] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const duplicates = Object.entries(codeFrequency)
      .filter(([_, count]) => count > 1)
      .map(([code, count]) => {
        const matches = results.filter(r => r.code === code);
        return {
          code,
          count,
          titles: matches.map(r => r.primaryTitle)
        };
      });

    const response: SearchResponse = {
      items: results.slice(offset, offset + limit),
      totalCount: results.length,
      currentPage: page,
      totalPages: Math.ceil(results.length / limit),
      query
    };

    return new Response(JSON.stringify(response), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error in job title search:', error);
    return new Response(JSON.stringify({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}