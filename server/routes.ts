import type { Express } from "express";
import { createServer, type Server } from "http";
import { db } from "@db";
import { industries, roles, companies, trialPlans, socMajorGroups, socMinorGroups, socDetailedOccupations } from "@db/schema";
import { eq, ilike } from "drizzle-orm";

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

  // Get all job titles (including alternative titles)
  app.get("/api/job-titles", async (req, res) => {
    try {
      const searchTerm = req.query.search as string | undefined;

      const query = db.select({
        code: socDetailedOccupations.code,
        title: socDetailedOccupations.title,
        alternativeTitles: socDetailedOccupations.alternativeTitles,
        minorGroupCode: socDetailedOccupations.minorGroupCode,
      })
      .from(socDetailedOccupations);

      if (searchTerm) {
        query.where(ilike(socDetailedOccupations.title, `%${searchTerm}%`));
      }

      const results = await query;

      // Flatten the results to include both primary and alternative titles
      const flattenedTitles = results.flatMap(occupation => {
        const titles = [{ 
          title: occupation.title, 
          code: occupation.code,
          isAlternative: false 
        }];

        if (occupation.alternativeTitles) {
          const altTitles = (occupation.alternativeTitles as string[]).map(alt => ({
            title: alt,
            code: occupation.code,
            isAlternative: true
          }));
          titles.push(...altTitles);
        }

        return titles;
      });

      res.json(flattenedTitles);
    } catch (error) {
      console.error('Error fetching job titles:', error);
      res.status(500).json({ error: "Failed to fetch job titles" });
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