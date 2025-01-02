import { pgTable, text, serial, integer, jsonb, varchar, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

// SOC Classification tables
export const socMajorGroups = pgTable("soc_major_groups", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 2 }).notNull().unique(), // e.g., "11"
  title: text("title").notNull(), // e.g., "Management Occupations"
  description: text("description"),
});

export const socMinorGroups = pgTable("soc_minor_groups", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 4 }).notNull().unique(), // e.g., "11-3"
  majorGroupCode: varchar("major_group_code", { length: 2 })
    .notNull()
    .references(() => socMajorGroups.code),
  title: text("title").notNull(), // e.g., "Operations Specialties Managers"
  description: text("description"),
});

// Updated socDetailedOccupations table with consolidated structure
export const socDetailedOccupations = pgTable("soc_detailed_occupations", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 7 }).notNull().unique(), // e.g., "11-3021"
  title: text("title").notNull(), // Primary/canonical title
  description: text("description"),
  minorGroupCode: varchar("minor_group_code", { length: 4 })
    .notNull()
    .references(() => socMinorGroups.code),
  alternativeTitles: jsonb("alternative_titles").default('[]').notNull(), // Array of alternative titles
  skills: jsonb("skills").default('[]').notNull(), // Required skills
  tasks: jsonb("tasks").default('[]').notNull(), // Common tasks
  metadata: jsonb("metadata").default('{}').notNull(), // Additional occupation metadata
});

export const industries = pgTable("industries", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  naicsCode: text("naics_code").notNull().unique(),
  description: text("description"),
  displayName: text("display_name").notNull(), // User-friendly name for display
});

export const roles = pgTable("roles", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  socCode: varchar("soc_code", { length: 7 })
    .notNull()
    .references(() => socDetailedOccupations.code),
  description: text("description"),
  customSkills: jsonb("custom_skills").default('[]'), // Additional skills specific to this role
});

export const companies = pgTable("companies", {
  id: serial("id").primaryKey(),
  size: text("size").notNull(), // small, medium, large
  stage: text("stage").notNull(), // startup, scaling, established
  location: text("location"),
  industryId: integer("industry_id").references(() => industries.id),
});

export const trialPlans = pgTable("trial_plans", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").references(() => companies.id),
  roleId: integer("role_id").references(() => roles.id),
  scenario: text("scenario").notNull(), // new, replacement, expansion
  trialLength: integer("trial_length").notNull(), // in weeks
  evaluationSchedule: jsonb("evaluation_schedule").notNull(),
  metrics: jsonb("metrics").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Type definitions
export type Industry = typeof industries.$inferSelect;
export type Company = typeof companies.$inferSelect;
export type SocMajorGroup = typeof socMajorGroups.$inferSelect;
export type SocMinorGroup = typeof socMinorGroups.$inferSelect;
export type SocDetailedOccupation = typeof socDetailedOccupations.$inferSelect;
export type Role = typeof roles.$inferSelect;
export type TrialPlan = typeof trialPlans.$inferSelect;