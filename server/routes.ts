import type { Express, Request, Response } from "express";
import { createServer } from "node:http";
import type { Server } from "node:http";
import { storage } from "./storage";
import { insertRoundSchema, insertDiagnosisSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Rounds
  app.get("/api/rounds", async (_req, res) => {
    const rows = await storage.listRounds();
    res.json(rows);
  });

  app.get("/api/rounds/:id", async (req, res) => {
    const row = await storage.getRound(req.params.id);
    if (!row) return res.status(404).json({ error: "not found" });
    res.json(row);
  });

  app.post("/api/rounds", async (req, res) => {
    try {
      const body = insertRoundSchema.parse(req.body);
      const created = await storage.createRound(body);
      res.json(created);
    } catch (e) {
      if (e instanceof z.ZodError) return res.status(400).json({ error: e.errors });
      throw e;
    }
  });

  app.patch("/api/rounds/:id", async (req, res) => {
    try {
      const body = insertRoundSchema.partial().parse(req.body);
      const updated = await storage.updateRound(req.params.id, body);
      if (!updated) return res.status(404).json({ error: "not found" });
      res.json(updated);
    } catch (e) {
      if (e instanceof z.ZodError) return res.status(400).json({ error: e.errors });
      throw e;
    }
  });

  app.delete("/api/rounds/:id", async (req, res) => {
    const ok = await storage.deleteRound(req.params.id);
    if (!ok) return res.status(404).json({ error: "not found" });
    res.json({ ok: true });
  });

  // Diagnoses
  app.get("/api/diagnoses", async (_req, res) => {
    const rows = await storage.listDiagnoses();
    res.json(rows);
  });

  app.post("/api/diagnoses", async (req, res) => {
    try {
      const body = insertDiagnosisSchema.parse(req.body);
      const created = await storage.createDiagnosis(body);
      res.json(created);
    } catch (e) {
      if (e instanceof z.ZodError) return res.status(400).json({ error: e.errors });
      throw e;
    }
  });

  // Meta
  app.get("/api/meta", async (_req, res) => {
    const draft = await storage.getMeta("draft");
    const settings = await storage.getMeta("settings");
    res.json({
      draft: draft ? JSON.parse(draft) : null,
      settings: settings ? JSON.parse(settings) : null,
    });
  });

  app.patch("/api/meta", async (req, res) => {
    const body = z.object({
      draft: z.any().optional(),
      settings: z.any().optional(),
    }).parse(req.body);
    if ("draft" in body) {
      if (body.draft === null) await storage.setMeta("draft", "null");
      else await storage.setMeta("draft", JSON.stringify(body.draft));
    }
    if ("settings" in body) {
      await storage.setMeta("settings", JSON.stringify(body.settings));
    }
    res.json({ ok: true });
  });

  // Export / Import
  app.get("/api/export", async (_req, res) => {
    const data = await storage.exportAll();
    res.json({
      schemaVersion: 2,
      exportedAt: new Date().toISOString(),
      ...data,
    });
  });

  app.post("/api/import", async (req, res) => {
    const body = z.object({
      rounds: z.array(z.any()),
      diagnoses: z.array(z.any()).optional(),
      meta: z.record(z.string()).optional(),
    }).parse(req.body);
    await storage.importAll(body as any);
    res.json({ ok: true });
  });

  app.post("/api/clear", async (_req, res) => {
    await storage.clearAll();
    res.json({ ok: true });
  });

  return httpServer;
}
