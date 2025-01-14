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
  const SECTOR_BOOST_ALPHA = 0.3;
  const SECTOR_FILTER_THRESHOLD = 1.0;

  let filteredItems = items;
  if (!showAll && sector) {
    filteredItems = filteredItems.filter(item => {
      const dist = item.sector_distribution ?? 0;
      return dist >= SECTOR_FILTER_THRESHOLD;
    });
  }

  // Track which codes we've seen to prevent duplicates
  const resultsByCode = new Map<string, ConsolidatedJobResult>();
  const queryLower = query.toLowerCase();

  // Process all items preserving original titles
  for (const item of filteredItems) {
    if (!resultsByCode.has(item.code)) {
      // Get official title from detailed occupations
      const primaryTitle = await db.query.socDetailedOccupations.findFirst({
        where: eq(socDetailedOccupations.code, item.code),
        columns: { title: true }
      });

      console.log('Processing search result:', {
        code: item.code,
        officialTitle: primaryTitle?.title,
        matchedTitle: item.title,
        isAlternative: item.title !== primaryTitle?.title,
        alternativeTitlesCount: item.alternativeTitles?.length || 0,
        sectorDistribution: item.sectorDistribution,
        sector: sector ? `NAICS${sector}` : undefined,
        topIndustries: item.topIndustries
      });

      resultsByCode.set(item.code, {
        code: item.code,
        primaryTitle: primaryTitle?.title || item.title,
        title: primaryTitle?.title || item.title, // Use official title if found
        description: item.description,
        alternativeTitles: item.alternativeTitles || [],
        matchedAlternatives: [],
        isAlternative: false,
        rank: 1.0,
        majorGroup: item.majorGroup,
        minorGroup: item.minorGroup,
        topIndustries: item.topIndustries,
        sectorDistribution: item.sectorDistribution // Added sectorDistribution
      });
    }
  }

  // Second pass - add alternative title matches only if not already included
  for (const item of filteredItems) {
    if (resultsByCode.has(item.code)) continue;

    const matchedAlt = (item.alternativeTitles || []).find(alt =>
      alt.toLowerCase().includes(queryLower) || queryLower.includes(alt.toLowerCase())
    );

    if (matchedAlt) {
      // Get official title from detailed occupations
      const primaryTitle = await db.query.socDetailedOccupations.findFirst({
        where: eq(socDetailedOccupations.code, item.code),
        columns: { title: true }
      });

      console.log('Processing search result:', {
        code: item.code,
        officialTitle: primaryTitle?.title,
        matchedTitle: item.title,
        isAlternative: item.title !== primaryTitle?.title,
        alternativeTitlesCount: item.alternativeTitles?.length || 0,
        sectorDistribution: item.sectorDistribution,
        sector: sector ? `NAICS${sector}` : undefined,
        topIndustries: item.topIndustries
      });

      resultsByCode.set(item.code, {
        code: item.code,
        primaryTitle: primaryTitle?.title || item.title,
        title: primaryTitle?.title || item.title, // Always use official title
        description: item.description,
        alternativeTitles: item.alternativeTitles || [],
        matchedAlternatives: [matchedAlt],
        isAlternative: true,
        rank: 0.9,
        majorGroup: item.majorGroup,
        minorGroup: item.minorGroup,
        topIndustries: item.topIndustries,
        sectorDistribution: item.sectorDistribution // Added sectorDistribution
      });
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
      const primaryTitle = await db.query.socDetailedOccupations.findFirst({
        where: eq(socDetailedOccupations.code, item.code),
        columns: { title: true }
      });

      resultsByCode.set(item.code, {
        code: item.code,
        primaryTitle: primaryTitle?.title || item.title,
        title: primaryTitle?.title || item.title,
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

  return Array.from(resultsByCode.values())
    .sort((a, b) => {
      // First sort by rank
      const rankDiff = b.rank - a.rank;
      if (rankDiff !== 0) return rankDiff;

      // Then by whether it's a primary title match
      if (!a.isAlternative && b.isAlternative) return -1;
      if (a.isAlternative && !b.isAlternative) return 1;

      // Then by number of matched alternatives
      return b.matchedAlternatives.length - a.matchedAlternatives.length;
    });
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const query = url.searchParams.get('search')?.trim() || '';
    const sector = url.searchParams.get('sector')?.trim();

    console.log('Search request:', {
      query,
      sector,
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
              INNER JOIN ${socSectorDistribution} sl ON sl.soc_code = sd.soc_code AND sl.sector_label = ${sector ? `NAICS${sector}` : 'NONE'}
              WHERE sd.soc_code = ${socDetailedOccupations.code}
              LIMIT 1
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

    if (exactMatches.length >= 5) {
      const results = await consolidateResults(exactMatches, query, sector);

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
        sectorDistribution: sector ? socSectorDistribution.percentage : sql<number>`0`,
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
          eq(socSectorDistribution.sectorLabel, sector ? `NAICS${sector}` : sql`''`)
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
    const results = await consolidateResults(fuseResults.map(r => r.item), query, sector);

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