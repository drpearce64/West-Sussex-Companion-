import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Round, Diagnosis, RoundDraft, HoleScore, Tees } from "./types";
import type { RoundRow, DiagnosisRow } from "@shared/schema";
import { ulid } from "ulid";
import { nowISO } from "@/lib/date";

/* === De/serialization between row format and domain Round === */

function rowToRound(row: RoundRow): Round {
  let holes: HoleScore[];
  try { holes = JSON.parse(row.holes); } catch { holes = []; }
  // Migration: v1 row has no tees — default to white.
  const tees: Tees = (row as any).tees === "yellow" ? "yellow" : "white";
  return {
    id: row.id,
    date: row.date,
    partners: row.partners ?? "",
    notes: row.notes ?? undefined,
    holes,
    tees,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    schemaVersion: 2,
  };
}

function roundToRow(r: Round): RoundRow {
  return {
    id: r.id,
    date: r.date,
    partners: r.partners,
    notes: r.notes ?? null,
    holes: JSON.stringify(r.holes),
    tees: r.tees,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    schemaVersion: "2",
  };
}

function rowToDiagnosis(row: DiagnosisRow): Diagnosis {
  let affected: number[] | undefined = undefined;
  if (row.affectedHoles) {
    try { affected = JSON.parse(row.affectedHoles); } catch { /* ignore */ }
  }
  return {
    id: row.id,
    generatedAt: row.generatedAt,
    windowStart: row.windowStart,
    windowEnd: row.windowEnd,
    ruleId: row.ruleId,
    headline: row.headline,
    body: row.body,
    affectedHoles: affected,
  };
}

/* === Hooks === */

export function useRounds() {
  return useQuery<Round[]>({
    queryKey: ["/api/rounds"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/rounds");
      const rows = (await res.json()) as RoundRow[];
      return rows.map(rowToRound);
    },
  });
}

export function useRound(id: string | undefined) {
  return useQuery<Round | null>({
    queryKey: ["/api/rounds", id],
    enabled: !!id,
    queryFn: async () => {
      if (!id) return null;
      const res = await apiRequest("GET", `/api/rounds/${id}`);
      const row = (await res.json()) as RoundRow;
      return rowToRound(row);
    },
  });
}

export function useCreateRound() {
  return useMutation<Round, Error, { date: string; partners: string; notes?: string; holes: HoleScore[]; tees: Tees }>({
    mutationFn: async (input) => {
      const now = nowISO();
      const round: Round = {
        id: ulid(),
        date: input.date,
        partners: input.partners,
        notes: input.notes,
        holes: input.holes,
        tees: input.tees,
        createdAt: now,
        updatedAt: now,
        schemaVersion: 2,
      };
      const res = await apiRequest("POST", "/api/rounds", roundToRow(round));
      const row = (await res.json()) as RoundRow;
      return rowToRound(row);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rounds"] });
    },
  });
}

export function useUpdateRound() {
  return useMutation<Round, Error, { id: string; patch: Partial<Round> }>({
    mutationFn: async ({ id, patch }) => {
      const body: any = { ...patch, updatedAt: nowISO() };
      if (patch.holes) body.holes = JSON.stringify(patch.holes);
      const res = await apiRequest("PATCH", `/api/rounds/${id}`, body);
      const row = (await res.json()) as RoundRow;
      return rowToRound(row);
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ["/api/rounds"] });
      queryClient.invalidateQueries({ queryKey: ["/api/rounds", vars.id] });
    },
  });
}

export function useDeleteRound() {
  return useMutation<{ ok: boolean }, Error, string>({
    mutationFn: async (id) => {
      const res = await apiRequest("DELETE", `/api/rounds/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rounds"] });
    },
  });
}

/* Diagnoses */

export function useDiagnoses() {
  return useQuery<Diagnosis[]>({
    queryKey: ["/api/diagnoses"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/diagnoses");
      const rows = (await res.json()) as DiagnosisRow[];
      return rows.map(rowToDiagnosis);
    },
  });
}

export function useCreateDiagnosis() {
  return useMutation<Diagnosis, Error, Diagnosis>({
    mutationFn: async (d) => {
      const body = {
        id: d.id,
        generatedAt: d.generatedAt,
        windowStart: d.windowStart,
        windowEnd: d.windowEnd,
        ruleId: d.ruleId,
        headline: d.headline,
        body: d.body,
        affectedHoles: d.affectedHoles ? JSON.stringify(d.affectedHoles) : null,
      };
      const res = await apiRequest("POST", "/api/diagnoses", body);
      const row = (await res.json()) as DiagnosisRow;
      return rowToDiagnosis(row);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/diagnoses"] });
    },
  });
}

/* Meta (draft) */

type MetaPayload = { draft: RoundDraft | null; settings: any };

export function useMeta() {
  return useQuery<MetaPayload>({
    queryKey: ["/api/meta"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/meta");
      return res.json();
    },
  });
}

export function useSetDraft() {
  return useMutation<void, Error, RoundDraft | null>({
    mutationFn: async (draft) => {
      await apiRequest("PATCH", "/api/meta", { draft });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/meta"] });
    },
  });
}
