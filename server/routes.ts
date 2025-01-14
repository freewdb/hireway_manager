import type { Express } from "express";
import { createServer, type Server } from "http";
import { db } from "@db";
import { socDetailedOccupations, socMajorGroups, socMinorGroups } from "@db/schema";
import { sql, eq, or, and } from "drizzle-orm";
import Fuse from 'fuse.js';
import * as top from "./api/soc/top";
import * as search from "./api/soc/search";

export function registerRoutes(app: Express): Server {
  app.get("/api/job-titles", async (req, res) => {
    try {
      const searchTerm = req.query.search as string | undefined;
      console.log('Search request received:', { 
        searchTerm,
        queryParams: req.query,
        path: req.path
      });

      if (!searchTerm || searchTerm.length < 2) {
        console.log('Search term too short or undefined');
        return res.json([]);
      }

      // First try an exact match with ILIKE
      console.log('Attempting exact match search for:', searchTerm);
      const dbResults = await db.select({
        code: socDetailedOccupations.code,
        title: socDetailedOccupations.title,
        description: socDetailedOccupations.description,
        alternativeTitles: socDetailedOccupations.alternativeTitles,
        minorGroupCode: socDetailedOccupations.minorGroupCode,
        searchableText: socDetailedOccupations.searchableText,
      })
      .from(socDetailedOccupations)
      .where(sql`${socDetailedOccupations.searchableText} ILIKE ${`%${searchTerm}%`}`);

      console.log('Initial database query results:', { 
        count: dbResults.length,
        searchTerm,
        firstResult: dbResults[0] ? {
          code: dbResults[0].code,
          title: dbResults[0].title,
          searchableText: dbResults[0].searchableText?.substring(0, 100)
        } : null
      });

      // If no results, try word-by-word search
      if (!dbResults.length) {
        const words = searchTerm.toLowerCase().split(/\s+/).filter(Boolean);
        console.log('No exact matches, trying word-by-word search with:', words);

        const conditions = words.map(word => 
          sql`${socDetailedOccupations.searchableText} ILIKE ${`%${word}%`}`
        );

        const results = await db.select({
          code: socDetailedOccupations.code,
          title: socDetailedOccupations.title,
          description: socDetailedOccupations.description,
          alternativeTitles: socDetailedOccupations.alternativeTitles,
          minorGroupCode: socDetailedOccupations.minorGroupCode,
          searchableText: socDetailedOccupations.searchableText,
        })
        .from(socDetailedOccupations)
        .where(sql`(${sql.join(conditions, sql` OR `)})`);

        console.log('Word-by-word search results:', {
          count: results.length,
          words,
          firstResult: results[0] ? {
            code: results[0].code,
            title: results[0].title,
            searchableText: results[0].searchableText?.substring(0, 100)
          } : null
        });

        dbResults.push(...results);
      }

      if (!dbResults.length) {
        console.log('No results found in database');
        return res.json([]);
      }

      // Get related group information
      const minorGroupCodes = Array.from(new Set(dbResults.map(r => r.minorGroupCode)));
      const relatedMinorGroups = await db.select()
        .from(socMinorGroups)
        .where(or(...minorGroupCodes.map(code => eq(socMinorGroups.code, code))));

      const majorGroupCodes = Array.from(new Set(relatedMinorGroups.map(r => r.majorGroupCode)));
      const relatedMajorGroups = await db.select()
        .from(socMajorGroups)
        .where(or(...majorGroupCodes.map(code => eq(socMajorGroups.code, code))));

      // Create searchable items including alternative titles
      const searchItems = dbResults.flatMap(result => {
        // Main title
        const items = [{
          code: result.code,
          title: result.title,
          isAlternative: false,
          rank: 1,
          description: result.description || undefined,
          majorGroup: relatedMajorGroups.find(mg => 
            relatedMinorGroups.some(rg => 
              rg.majorGroupCode === mg.code && rg.code === result.minorGroupCode
            )
          ),
          minorGroup: relatedMinorGroups.find(mg => mg.code === result.minorGroupCode)
        }];

        // Alternative titles
        if (result.alternativeTitles?.length) {
          items.push(...result.alternativeTitles.map(altTitle => ({
            code: result.code,
            title: altTitle,
            isAlternative: true,
            rank: 0.9,
            description: result.description || undefined,
            majorGroup: items[0].majorGroup,
            minorGroup: items[0].minorGroup
          })));
        }

        return items;
      });

      // Use very lenient fuzzy search settings
      const fuse = new Fuse(searchItems, {
        keys: ['title', 'description'],
        includeScore: true,
        threshold: 0.9, // Very lenient matching
        minMatchCharLength: 2,
        distance: 200, // Increased distance for better matching
        useExtendedSearch: true
      });

      const fuseResults = fuse.search(searchTerm);

      console.log('Fuzzy search results:', {
        searchItemsCount: searchItems.length,
        fuseResultsCount: fuseResults.length,
        topResults: fuseResults.slice(0, 3).map(r => ({
          title: r.item.title,
          score: r.score
        }))
      });

      // Return all results if we have very few, otherwise limit to top 20
      const finalResults = fuseResults
        .map(result => ({
          ...result.item,
          rank: result.item.rank * (1 - (result.score || 0))
        }))
        .sort((a, b) => b.rank - a.rank)
        .slice(0, Math.min(fuseResults.length, 20));

      console.log('Returning results:', {
        count: finalResults.length,
        firstResult: finalResults[0]
      });

      res.json(finalResults);
    } catch (error) {
      console.error('Error in job titles search:', error);
      res.status(500).json({ 
        error: "Failed to search job titles",
        details: process.env.NODE_ENV === 'development' ? String(error) : undefined
      });
    }
  });

  app.get("/api/soc/top", async (req, res) => {
    try {
      const response = await top.GET(req);
      const data = await response.json();
      res.status(response.status || 200).json(data);
    } catch (error) {
      console.error("Error in /api/soc/top:", error);
      res.status(500).json({ error: "Failed to fetch top SOC data" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}