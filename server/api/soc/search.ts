import { eq, sql, and, or, desc, ilike } from 'drizzle-orm';
import { db } from '../../../db';
import { socDetailedOccupations, socMajorGroups, socMinorGroups } from '../../../db/schema';
import type { JobTitleSearchResult } from '../../../db/schema';
import Fuse from 'fuse.js';

interface ConsolidatedJobResult {
  code: string;
  primaryTitle: string;
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
}

interface SearchResponse {
  items: ConsolidatedJobResult[];
  totalCount: number;
  currentPage: number;
  totalPages: number;
  query: string;
}

function consolidateResults(items: any[], query: string): ConsolidatedJobResult[] {
  const resultsByCode = new Map<string, ConsolidatedJobResult>();
  const queryLower = query.toLowerCase();
  const queryWords = queryLower.split(/\s+/);

  items.forEach(item => {
    const titleLower = item.title.toLowerCase();
    const alternativeTitles = item.alternativeTitles || [];
    
    // Calculate match quality for ranking
    const titleMatchQuality = queryWords.every(word => titleLower.includes(word)) ? 1 :
      queryWords.some(word => titleLower.includes(word)) ? 0.8 : 0;
    
    // Find matching alternative titles
    const matchedAlternatives = alternativeTitles.filter((alt: string) => {
      const altLower = alt.toLowerCase();
      return queryWords.every(word => altLower.includes(word)) ||
             queryLower.includes(altLower) ||
             altLower.includes(queryLower);
    });

    // Determine if this is primarily an alternative title match
    const isAlternative = titleMatchQuality === 0 && matchedAlternatives.length > 0;
    
    // Calculate overall rank
    const rank = isAlternative ? 0.9 : 1;

    if (!resultsByCode.has(item.code)) {
      resultsByCode.set(item.code, {
        code: item.code,
        primaryTitle: item.title,
        description: item.description || undefined,
        alternativeTitles,
        matchedAlternatives,
        isAlternative,
        rank,
        majorGroup: item.majorGroup?.code ? {
          code: item.majorGroup.code,
          title: item.majorGroup.title
        } : undefined,
        minorGroup: item.minorGroup?.code ? {
          code: item.minorGroup.code,
          title: item.minorGroup.title
        } : undefined
      });
    } else {
      const existing = resultsByCode.get(item.code)!;
      
      // Update rank if this match is better
      if (rank > existing.rank) {
        existing.rank = rank;
        existing.isAlternative = isAlternative;
      }
      
      // Add any new matched alternatives
      matchedAlternatives.forEach((alt: string) => {
        if (!existing.matchedAlternatives.includes(alt)) {
          existing.matchedAlternatives.push(alt);
        }
      });

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
    const industry = url.searchParams.get('industry') || '';
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(url.searchParams.get('limit') || '20', 10)));
    const offset = (page - 1) * limit;

    console.log('Search request received:', {
      searchTerm: query,
      page,
      limit,
      offset,
      queryParams: Object.fromEntries(url.searchParams),
      path: url.pathname
    });

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
    console.log('Attempting exact match search for:', query);
    console.log('Searching with query:', query);
    
    const exactMatches = await db
      .select({
        code: socDetailedOccupations.code,
        title: socDetailedOccupations.title,
        description: socDetailedOccupations.description,
        alternativeTitles: socDetailedOccupations.alternativeTitles,
        searchableText: socDetailedOccupations.searchableText,
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
      const results = consolidateResults(exactMatches, query);
      
      const response: SearchResponse = {
        items: results.slice(offset, offset + limit),
        totalCount: results.length,
        currentPage: page,
        totalPages: Math.ceil(results.length / limit),
        query
      };

      console.log('Returning exact match results:', {
        totalCount: results.length,
        returnedCount: response.items.length,
        page,
        totalPages: response.totalPages
      });

      return new Response(JSON.stringify(response), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // If not enough exact matches, try fuzzy search
    console.log('Few or no exact matches, trying fuzzy search...');
    
    const potentialMatches = await db
      .select({
        code: socDetailedOccupations.code,
        title: socDetailedOccupations.title,
        description: socDetailedOccupations.description,
        alternativeTitles: socDetailedOccupations.alternativeTitles,
        searchableText: socDetailedOccupations.searchableText,
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
    const results = consolidateResults(fuseResults.map(r => r.item), query);
    
    const response: SearchResponse = {
      items: results.slice(offset, offset + limit),
      totalCount: results.length,
      currentPage: page,
      totalPages: Math.ceil(results.length / limit),
      query
    };

    console.log('Returning fuzzy search results:', {
      totalCount: results.length,
      returnedCount: response.items.length,
      page,
      totalPages: response.totalPages
    });

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