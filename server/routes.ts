import type { Express } from "express";
import { createServer, type Server } from "http";
import { db } from "@db";
import { socDetailedOccupations, socMajorGroups, socMinorGroups } from "@db/schema";
import { sql } from "drizzle-orm";
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
  app.get("/api/job-titles", async (req, res) => {
    try {
      const searchTerm = req.query.search as string | undefined;

      if (!searchTerm || searchTerm.length < 2) {
        return res.json([]);
      }

      // Step 1: Initial PostgreSQL search using ts_vector
      const searchQuery = searchTerm
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .map(term => term.replace(/[^\w\s]/g, ''))  // Remove special characters
        .map(term => `${term}:*`)
        .join(' | ');  // Changed from & to | for broader matches

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
      .limit(100);  // Increased limit for better fuzzy search results

      if (dbResults.length === 0) {
        return res.json([]);
      }

      // Step 2: Get group information for context
      const minorGroupCodes = Array.from(new Set(dbResults.map(r => r.minorGroupCode)));
      const relatedMinorGroups = await db.select()
        .from(socMinorGroups)
        .where(sql`code = ANY(${minorGroupCodes})`);

      const majorGroupCodes = Array.from(new Set(relatedMinorGroups.map(r => r.majorGroupCode)));
      const relatedMajorGroups = await db.select()
        .from(socMajorGroups)
        .where(sql`code = ANY(${majorGroupCodes})`);

      // Step 3: Create searchable items including alternative titles
      const searchItems = dbResults.flatMap(result => {
        // Create base item with primary title
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
        if (result.alternativeTitles && result.alternativeTitles.length > 0) {
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

      // Step 4: Apply fuzzy search for better matching
      const fuse = new Fuse(searchItems, {
        keys: ['title'],
        includeScore: true,
        threshold: 0.4,  // Increased threshold for more lenient matching
        distance: 200,   // Increased distance for better partial matches
        minMatchCharLength: 2
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