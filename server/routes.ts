import type { Express } from "express";
import { createServer, type Server } from "http";
import { db } from "@db";
import { socDetailedOccupations, socMajorGroups, socMinorGroups } from "@db/schema";
import { sql, ilike, eq, and } from "drizzle-orm";
import Fuse from 'fuse.js';

interface JobTitleSearchResult {
  code: string;
  title: string;
  isAlternative: boolean;
  rank: number;
  description?: string;
  majorGroup?: { code: string; title: string };
  minorGroup?: { code: string; title: string };
}

export function registerRoutes(app: Express): Server {
  // Get SOC hierarchy with search capability
  app.get("/api/soc-hierarchy", async (req, res) => {
    try {
      const searchTerm = req.query.search as string | undefined;

      // Get base data
      const majorGroups = await db.select().from(socMajorGroups);
      const minorGroups = await db.select().from(socMinorGroups);

      // If searching, filter occupations based on search vector
      let occupations;
      if (searchTerm) {
        const searchQuery = searchTerm
          .trim()
          .split(/\s+/)
          .filter(Boolean)
          .map(term => `${term}:*`)
          .join(' & ');

        occupations = await db.select()
          .from(socDetailedOccupations)
          .where(
            sql`search_vector @@ to_tsquery('english', ${searchQuery})`
          );
      } else {
        occupations = await db.select().from(socDetailedOccupations);
      }

      // Build the hierarchy
      const hierarchy = majorGroups.map(major => ({
        ...major,
        minorGroups: minorGroups
          .filter(minor => minor.majorGroupCode === major.code)
          .map(minor => ({
            ...minor,
            occupations: occupations.filter(occ => occ.minorGroupCode === minor.code)
          }))
      }));

      res.json({ majorGroups: hierarchy });
    } catch (error) {
      console.error('Error in SOC hierarchy:', error);
      res.status(500).json({ error: "Failed to fetch SOC hierarchy" });
    }
  });

  // Enhanced job titles search endpoint with fuzzy matching
  app.get("/api/job-titles", async (req, res) => {
    try {
      const searchTerm = req.query.search as string | undefined;

      if (!searchTerm || searchTerm.length < 2) {
        return res.json([]);
      }

      // Step 1: Get initial matches using PostgreSQL full-text search
      const searchQuery = searchTerm
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .map(term => `${term}:*`)
        .join(' & ');

      const dbResults = await db.select({
        code: socDetailedOccupations.code,
        title: socDetailedOccupations.title,
        description: socDetailedOccupations.description,
        alternativeTitles: socDetailedOccupations.alternativeTitles,
        minorGroupCode: socDetailedOccupations.minorGroupCode,
        rank: sql<number>`ts_rank_cd(search_vector, to_tsquery('english', ${searchQuery}))`
      })
      .from(socDetailedOccupations)
      .where(sql`search_vector @@ to_tsquery('english', ${searchQuery})`)
      .orderBy(sql`ts_rank_cd(search_vector, to_tsquery('english', ${searchQuery})) DESC`)
      .limit(50);

      // Step 2: Get related group information
      const minorGroupCodes = [...new Set(dbResults.map(r => r.minorGroupCode))];
      const relatedMinorGroups = await db.select()
        .from(socMinorGroups)
        .where(sql`code = ANY(${minorGroupCodes})`);

      const majorGroupCodes = [...new Set(relatedMinorGroups.map(r => r.majorGroupCode))];
      const relatedMajorGroups = await db.select()
        .from(socMajorGroups)
        .where(sql`code = ANY(${majorGroupCodes})`);

      // Step 3: Apply Fuse.js for better fuzzy matching on the results
      const searchItems = dbResults.flatMap(result => {
        // Create array with main title
        const items: JobTitleSearchResult[] = [{
          code: result.code,
          title: result.title,
          isAlternative: false,
          rank: result.rank,
          description: result.description || undefined,
          majorGroup: relatedMajorGroups.find(mg => 
            relatedMinorGroups.some(rg => 
              rg.majorGroupCode === mg.code && rg.code === result.minorGroupCode
            )
          ),
          minorGroup: relatedMinorGroups.find(mg => mg.code === result.minorGroupCode)
        }];

        // Add alternative titles if they exist
        if (result.alternativeTitles) {
          items.push(...result.alternativeTitles.map(altTitle => ({
            code: result.code,
            title: altTitle,
            isAlternative: true,
            rank: result.rank * 0.9, // Slightly lower rank for alternative titles
            description: result.description || undefined,
            majorGroup: items[0].majorGroup,
            minorGroup: items[0].minorGroup
          })));
        }

        return items;
      });

      // Configure Fuse.js for fuzzy searching
      const fuse = new Fuse(searchItems, {
        keys: ['title'],
        includeScore: true,
        threshold: 0.3,
        distance: 100
      });

      // Get fuzzy search results
      const fuseResults = fuse.search(searchTerm);

      // Transform and sort results
      const finalResults = fuseResults
        .map(result => ({
          ...result.item,
          rank: result.item.rank * (1 - (result.score || 0)) // Combine DB rank with Fuse.js score
        }))
        .sort((a, b) => b.rank - a.rank)
        .slice(0, 20); // Limit to top 20 results

      res.json(finalResults);
    } catch (error) {
      console.error('Error in job titles search:', error);
      res.status(500).json({ 
        error: "Failed to search job titles",
        details: process.env.NODE_ENV === 'development' ? String(error) : undefined
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}