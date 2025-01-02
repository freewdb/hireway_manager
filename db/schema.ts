import { pgTable, text, serial, varchar } from "drizzle-orm/pg-core";
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

export const socDetailedOccupations = pgTable("soc_detailed_occupations", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 7 }).notNull().unique(), // e.g., "11-3021"
  title: text("title").notNull(), // Primary/canonical title
  description: text("description"),
  minorGroupCode: varchar("minor_group_code", { length: 4 })
    .notNull()
    .references(() => socMinorGroups.code),
  alternativeTitles: text("alternative_titles").array(), // Array of alternative titles
  searchVector: text("search_vector", { mode: "tsvector" }),
});

// Type definitions
export type SocMajorGroup = typeof socMajorGroups.$inferSelect;
export type SocMinorGroup = typeof socMinorGroups.$inferSelect;
export type SocDetailedOccupation = typeof socDetailedOccupations.$inferSelect;