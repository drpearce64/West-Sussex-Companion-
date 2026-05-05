import { rounds, diagnoses, meta } from "@shared/schema";
import type { RoundRow, InsertRoundRow, DiagnosisRow, InsertDiagnosisRow } from "@shared/schema";
import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import { eq, desc, asc } from "drizzle-orm";

const sqlite = new Database("data.db");
sqlite.pragma("journal_mode = WAL");

// Ensure tables exist (drizzle migrations omitted; this app is single-table-set & simple)
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS rounds (
    id TEXT PRIMARY KEY,
    date TEXT NOT NULL,
    partners TEXT NOT NULL DEFAULT '',
    notes TEXT,
    holes TEXT NOT NULL,
    tees TEXT NOT NULL DEFAULT 'white',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    schema_version TEXT NOT NULL DEFAULT '2'
  );
  CREATE TABLE IF NOT EXISTS diagnoses (
    id TEXT PRIMARY KEY,
    generated_at TEXT NOT NULL,
    window_start TEXT NOT NULL,
    window_end TEXT NOT NULL,
    rule_id TEXT NOT NULL,
    headline TEXT NOT NULL,
    body TEXT NOT NULL,
    affected_holes TEXT
  );
  CREATE TABLE IF NOT EXISTS meta (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
`);

// Schema migration: add `tees` column for existing v1 deployments.
try {
  sqlite.exec("ALTER TABLE rounds ADD COLUMN tees TEXT NOT NULL DEFAULT 'white'");
} catch (e: any) {
  // Ignore "duplicate column" errors — column already exists.
  if (!/duplicate column/i.test(String(e?.message ?? e))) {
    // unknown error — log but don't crash boot.
    console.warn("[storage] tees migration skipped:", e?.message ?? e);
  }
}

export const db = drizzle(sqlite);

export interface IStorage {
  listRounds(): Promise<RoundRow[]>;
  getRound(id: string): Promise<RoundRow | undefined>;
  createRound(r: InsertRoundRow): Promise<RoundRow>;
  updateRound(id: string, patch: Partial<InsertRoundRow>): Promise<RoundRow | undefined>;
  deleteRound(id: string): Promise<boolean>;
  listDiagnoses(): Promise<DiagnosisRow[]>;
  createDiagnosis(d: InsertDiagnosisRow): Promise<DiagnosisRow>;
  getMeta(key: string): Promise<string | undefined>;
  setMeta(key: string, value: string): Promise<void>;
  exportAll(): Promise<{ rounds: RoundRow[]; diagnoses: DiagnosisRow[]; meta: Record<string, string> }>;
  importAll(data: { rounds: RoundRow[]; diagnoses?: DiagnosisRow[]; meta?: Record<string, string> }): Promise<void>;
  clearAll(): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async listRounds(): Promise<RoundRow[]> {
    return db.select().from(rounds).orderBy(desc(rounds.date), desc(rounds.createdAt)).all();
  }

  async getRound(id: string): Promise<RoundRow | undefined> {
    return db.select().from(rounds).where(eq(rounds.id, id)).get();
  }

  async createRound(r: InsertRoundRow): Promise<RoundRow> {
    return db.insert(rounds).values(r).returning().get();
  }

  async updateRound(id: string, patch: Partial<InsertRoundRow>): Promise<RoundRow | undefined> {
    const existing = await this.getRound(id);
    if (!existing) return undefined;
    return db.update(rounds).set(patch).where(eq(rounds.id, id)).returning().get();
  }

  async deleteRound(id: string): Promise<boolean> {
    const res = db.delete(rounds).where(eq(rounds.id, id)).run();
    return (res.changes ?? 0) > 0;
  }

  async listDiagnoses(): Promise<DiagnosisRow[]> {
    return db.select().from(diagnoses).orderBy(desc(diagnoses.generatedAt)).all();
  }

  async createDiagnosis(d: InsertDiagnosisRow): Promise<DiagnosisRow> {
    const created = db.insert(diagnoses).values(d).returning().get();
    // Cap at 12: delete oldest beyond that.
    const all = db.select().from(diagnoses).orderBy(desc(diagnoses.generatedAt)).all();
    if (all.length > 12) {
      const toRemove = all.slice(12);
      for (const row of toRemove) {
        db.delete(diagnoses).where(eq(diagnoses.id, row.id)).run();
      }
    }
    return created;
  }

  async getMeta(key: string): Promise<string | undefined> {
    const row = db.select().from(meta).where(eq(meta.key, key)).get();
    return row?.value;
  }

  async setMeta(key: string, value: string): Promise<void> {
    const existing = await this.getMeta(key);
    if (existing === undefined) {
      db.insert(meta).values({ key, value }).run();
    } else {
      db.update(meta).set({ value }).where(eq(meta.key, key)).run();
    }
  }

  async exportAll() {
    const allRounds = db.select().from(rounds).orderBy(asc(rounds.createdAt)).all();
    const allDiagnoses = db.select().from(diagnoses).orderBy(asc(diagnoses.generatedAt)).all();
    const metaRows = db.select().from(meta).all();
    const metaObj: Record<string, string> = {};
    for (const row of metaRows) metaObj[row.key] = row.value;
    return { rounds: allRounds, diagnoses: allDiagnoses, meta: metaObj };
  }

  async importAll(data: { rounds: RoundRow[]; diagnoses?: DiagnosisRow[]; meta?: Record<string, string> }) {
    await this.clearAll();
    for (const r of data.rounds || []) {
      // v1 imports omit `tees` — default to white. Bump schemaVersion to 2.
      const row: any = { ...r };
      if (row.tees == null) row.tees = "white";
      if (row.schemaVersion == null || row.schemaVersion === "1" || row.schemaVersion === 1) {
        row.schemaVersion = "2";
      }
      db.insert(rounds).values(row).run();
    }
    for (const d of data.diagnoses || []) {
      db.insert(diagnoses).values(d).run();
    }
    if (data.meta) {
      for (const [k, v] of Object.entries(data.meta)) {
        db.insert(meta).values({ key: k, value: v }).run();
      }
    }
  }

  async clearAll() {
    db.delete(rounds).run();
    db.delete(diagnoses).run();
    db.delete(meta).run();
  }
}

export const storage = new DatabaseStorage();
