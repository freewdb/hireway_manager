import type { Express } from "express";
import { createServer, type Server } from "http";
import { db } from "@db";
import { industries, roles, companies, trialPlans, socMajorGroups, socMinorGroups, socDetailedOccupations } from "@db/schema";
import { eq, ilike, sql, and, or } from "drizzle-orm";

export function registerRoutes(app: Express): Server {
  // Get industries
  app.get("/api/industries", async (_req, res) => {
    try {
      const allIndustries = await db.select().from(industries);
      res.json(allIndustries);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch industries" });
    }
  });

  // Get SOC hierarchy with search capability
  app.get("/api/soc-hierarchy", async (req, res) => {
    try {
      const searchTerm = req.query.search as string | undefined;

      // Get base data
      const majorGroups = await db.select().from(socMajorGroups);
      const minorGroups = await db.select().from(socMinorGroups);

      // If searching, filter occupations based on title or alternative titles
      let occupations;
      if (searchTerm) {
        occupations = await db.select()
          .from(socDetailedOccupations)
          .where(
            ilike(socDetailedOccupations.title, `%${searchTerm}%`)
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
      res.status(500).json({ error: "Failed to fetch SOC hierarchy" });
    }
  });

  // Enhanced job titles search endpoint
  app.get("/api/job-titles", async (req, res) => {
    try {
      const searchTerm = req.query.search as string | undefined;

      if (!searchTerm || searchTerm.length < 2) {
        return res.json([]);
      }

      // Convert search term to tsquery format
      const searchQuery = searchTerm.trim().split(/\s+/).join(' & ');

      // Perform full-text search with weighted ranking
      const results = await db
        .select({
          code: socDetailedOccupations.code,
          title: socDetailedOccupations.title,
          alternativeTitles: socDetailedOccupations.alternativeTitles,
          rank: sql<number>`
            (
              ts_rank(
                to_tsvector('english', 
                  coalesce(${socDetailedOccupations.title}, '') || ' ' || 
                  coalesce(${socDetailedOccupations.description}, '') || ' ' || 
                  coalesce(
                    array_to_string(${socDetailedOccupations.alternativeTitles}::text[], ' '),
                    ''
                  )
                ),
                to_tsquery('english', ${searchQuery})
              ) * 2 +
              similarity(${socDetailedOccupations.title}, ${searchTerm})
            )
          `.as('rank')
        })
        .from(socDetailedOccupations)
        .where(
          or(
            sql`
              to_tsvector('english', 
                coalesce(${socDetailedOccupations.title}, '') || ' ' || 
                coalesce(${socDetailedOccupations.description}, '') || ' ' || 
                coalesce(
                  array_to_string(${socDetailedOccupations.alternativeTitles}::text[], ' '),
                  ''
                )
              ) @@ to_tsquery('english', ${searchQuery})
            `,
            sql`similarity(${socDetailedOccupations.title}, ${searchTerm}) > 0.3`
          )
        )
        .orderBy(sql`rank DESC`)
        .limit(20);

      // Flatten the results to include both primary and alternative titles
      const flattenedTitles = results.flatMap(occupation => {
        const titles = [{ 
          title: occupation.title, 
          code: occupation.code,
          isAlternative: false,
          rank: occupation.rank
        }];

        if (occupation.alternativeTitles) {
          const altTitles = (occupation.alternativeTitles as string[])
            .filter(alt => alt && alt.toLowerCase().includes(searchTerm.toLowerCase()))
            .map(alt => ({
              title: alt,
              code: occupation.code,
              isAlternative: true,
              rank: occupation.rank * 0.8 // Slightly lower rank for alternative titles
            }));
          titles.push(...altTitles);
        }

        return titles;
      });

      // Sort by rank and return
      res.json(flattenedTitles.sort((a, b) => b.rank - a.rank));
    } catch (error) {
      console.error('Error in job titles search:', error);
      res.status(500).json({ error: "Failed to search job titles" });
    }
  });

  // Get roles
  app.get("/api/roles", async (_req, res) => {
    try {
      const allRoles = await db.select().from(roles);
      res.json(allRoles);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch roles" });
    }
  });

  // Create trial plan
  app.post("/api/trial-plans", async (req, res) => {
    try {
      const newPlan = await db.insert(trialPlans).values(req.body).returning();
      res.json(newPlan[0]);
    } catch (error) {
      res.status(500).json({ error: "Failed to create trial plan" });
    }
  });

  // Get trial plan by id
  app.get("/api/trial-plans/:id", async (req, res) => {
    try {
      const plan = await db.select()
        .from(trialPlans)
        .where(eq(trialPlans.id, parseInt(req.params.id)));

      if (plan.length === 0) {
        return res.status(404).json({ error: "Trial plan not found" });
      }

      res.json(plan[0]);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch trial plan" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}