import { sqliteTable, text } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

/**
 * Rounds table.
 *
 * `holes` stores the HoleScore[] as JSON text.
 * `tags` is not stored separately — it lives inside each HoleScore's tags array.
 * IDs are ULIDs (sortable, collision-free, generated on the client and server).
 */
export const rounds = sqliteTable("rounds", {
  id: text("id").primaryKey(),
  date: text("date").notNull(), // ISO YYYY-MM-DD
  partners: text("partners").notNull().default(""),
  notes: text("notes"),
  holes: text("holes").notNull(), // JSON HoleScore[]
  tees: text("tees").notNull().default("white"), // 'white' | 'yellow'
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
  schemaVersion: text("schema_version").notNull().default("2"),
});

export const diagnoses = sqliteTable("diagnoses", {
  id: text("id").primaryKey(),
  generatedAt: text("generated_at").notNull(),
  windowStart: text("window_start").notNull(),
  windowEnd: text("window_end").notNull(),
  ruleId: text("rule_id").notNull(),
  headline: text("headline").notNull(),
  body: text("body").notNull(),
  affectedHoles: text("affected_holes"), // JSON number[]
});

/** Single-row settings table. key = "settings" */
export const meta = sqliteTable("meta", {
  key: text("key").primaryKey(),
  value: text("value").notNull(), // JSON
});

/* ===== Zod request schemas ===== */

export const insertRoundSchema = createInsertSchema(rounds);
export const updateRoundSchema = createInsertSchema(rounds).partial().extend({
  id: z.string().optional(),
});

export const insertDiagnosisSchema = createInsertSchema(diagnoses);

export const setMetaSchema = z.object({
  key: z.string(),
  value: z.string(),
});

export type RoundRow = typeof rounds.$inferSelect;
export type InsertRoundRow = z.infer<typeof insertRoundSchema>;

export type DiagnosisRow = typeof diagnoses.$inferSelect;
export type InsertDiagnosisRow = z.infer<typeof insertDiagnosisSchema>;

export type MetaRow = typeof meta.$inferSelect;
