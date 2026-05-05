import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import {
  useRound,
  useCreateRound,
  useUpdateRound,
  useMeta,
  useSetDraft,
  useRounds,
  useCreateDiagnosis,
  useDiagnoses,
} from "@/features/rounds/repository";
import { WEST_SUSSEX, COURSE_PAR } from "@/features/course/west-sussex";
import { emptyHoles, HOLE_TAGS } from "@/features/rounds/types";
import type { HoleScore, HoleTag, RoundDraft, Tees } from "@/features/rounds/types";
import { apiRequest } from "@/lib/queryClient";
import { todayISO, shortBritish, nowISO, daysBetween } from "@/lib/date";
import { runDiagnosis } from "@/features/diagnosis/engine";

function parseQueryId(): string | null {
  // Wouter's useHashLocation may emit either `#/log?id=xxx` or `?id=xxx#/log`
  // depending on how the link href is normalised. Check both.
  const hash = window.location.hash; // e.g. #/log?id=xxx
  const afterHashQ = hash.split("?")[1];
  if (afterHashQ) {
    const id = new URLSearchParams(afterHashQ).get("id");
    if (id) return id;
  }
  const search = window.location.search;
  if (search) {
    const id = new URLSearchParams(search).get("id");
    if (id) return id;
  }
  return null;
}

export default function Logger() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const editId = parseQueryId();

  const { data: rounds = [] } = useRounds();
  const { data: diagnoses = [] } = useDiagnoses();
  const { data: existing } = useRound(editId ?? undefined);
  const { data: metaData } = useMeta();
  const setDraft = useSetDraft();
  const createRound = useCreateRound();
  const updateRound = useUpdateRound();
  const createDiagnosis = useCreateDiagnosis();

  const [date, setDate] = useState<string>(todayISO());
  const [partners, setPartners] = useState("");
  const [notes, setNotes] = useState("");
  const [holes, setHoles] = useState<HoleScore[]>(() => emptyHoles());
  const [tees, setTees] = useState<Tees>("white");
  const [originalTees, setOriginalTees] = useState<Tees | null>(null);
  const [activeHole, setActiveHole] = useState<number | null>(null);
  const [openTagsFor, setOpenTagsFor] = useState<number | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [showXInput, setShowXInput] = useState(false);
  const [xInput, setXInput] = useState("");

  // Hydration: editing > draft > defaults
  useEffect(() => {
    if (hydrated) return;
    if (editId) {
      if (existing) {
        setDate(existing.date);
        setPartners(existing.partners);
        setNotes(existing.notes ?? "");
        setHoles(existing.holes);
        setTees(existing.tees);
        setOriginalTees(existing.tees);
        setHydrated(true);
      }
    } else if (metaData) {
      const draft = metaData.draft;
      if (draft) {
        setDate(draft.date || todayISO());
        setPartners(draft.partners || "");
        setNotes(draft.notes || "");
        setHoles(draft.holes && draft.holes.length === 18 ? draft.holes : emptyHoles());
        if (draft.tees === "yellow" || draft.tees === "white") setTees(draft.tees);
      } else {
        // Default to last-used tees
        const settings = (metaData as any).settings;
        const lastTees = settings?.lastTees;
        if (lastTees === "yellow" || lastTees === "white") setTees(lastTees);
      }
      setHydrated(true);
    }
  }, [hydrated, editId, existing, metaData]);

  // Debounced draft autosave (only when not editing).
  const debounceRef = useRef<number | null>(null);
  useEffect(() => {
    if (!hydrated) return;
    if (editId) return; // don't write a draft while editing
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      const draft: RoundDraft = {
        date,
        partners,
        notes,
        holes,
        tees,
        updatedAt: nowISO(),
      };
      setDraft.mutate(draft);
    }, 500);
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, partners, notes, holes, tees, hydrated, editId]);

  const filledCount = holes.filter((h) => typeof h.score === "number" && h.score! > 0).length;
  const complete = filledCount === 18;
  const canSave = filledCount >= 1;
  const isPartial = canSave && !complete;
  const playedSum = holes.reduce((s, h) => s + (typeof h.score === "number" && h.score > 0 ? h.score : 0), 0);
  const playedPar = holes.reduce((s, h) => {
    if (typeof h.score === "number" && h.score > 0) {
      const c = WEST_SUSSEX.find((x) => x.hole === h.hole);
      return s + (c?.par ?? 0);
    }
    return s;
  }, 0);

  function setScore(hole: number, value: number | null) {
    setHoles((prev) => prev.map((h) => (h.hole === hole ? { ...h, score: value } : h)));
  }

  function toggleTag(hole: number, tag: HoleTag) {
    setHoles((prev) =>
      prev.map((h) => {
        if (h.hole !== hole) return h;
        const has = h.tags.includes(tag);
        return { ...h, tags: has ? h.tags.filter((t) => t !== tag) : [...h.tags, tag] };
      }),
    );
  }

  function chooseScore(score: number) {
    if (activeHole == null) return;
    setScore(activeHole, score);
    // Auto-advance to next hole
    if (activeHole < 18) {
      const next = activeHole + 1;
      setActiveHole(next);
      // ScrollIntoView with offset, after layout
      requestAnimationFrame(() => {
        const el = document.querySelector(`[data-hole-row="${next}"]`);
        if (el && "scrollIntoView" in el) {
          (el as HTMLElement).scrollIntoView({ block: "center", behavior: "smooth" });
        }
      });
    } else {
      setActiveHole(null);
    }
  }

  function commitX() {
    const n = parseInt(xInput, 10);
    if (!isNaN(n) && n >= 1 && n <= 20 && activeHole != null) {
      chooseScore(n);
      setXInput("");
      setShowXInput(false);
    }
  }

  async function persistLastTees() {
    const existingSettings = (metaData as any)?.settings ?? {};
    await apiRequest("PATCH", "/api/meta", { settings: { ...existingSettings, lastTees: tees } });
  }

  async function handleSave() {
    if (!canSave) return;
    if (editId && existing) {
      await updateRound.mutateAsync({
        id: editId,
        patch: {
          date,
          partners,
          notes: notes || undefined,
          holes,
          tees,
        },
      });
      await persistLastTees();
      // Recompute diagnosis if eligible
      await maybeRunDiagnosis(rounds.map((r) => (r.id === editId ? { ...r, date, partners, notes: notes || undefined, holes, tees } : r)));
      toast({ title: "Round saved", duration: 2000 });
      setLocation("/");
    } else {
      const created = await createRound.mutateAsync({
        date,
        partners,
        notes: notes || undefined,
        holes,
        tees,
      });
      await persistLastTees();
      // Clear draft
      await setDraft.mutateAsync(null);
      // Try diagnosis
      await maybeRunDiagnosis([...rounds, created]);
      toast({ title: "Round saved", duration: 2000 });
      setLocation("/");
    }
  }

  async function maybeRunDiagnosis(allRounds: typeof rounds) {
    if (allRounds.length < 10) return;
    const latest = diagnoses[0];
    if (latest && daysBetween(latest.generatedAt, nowISO()) < 7) return;
    const diag = runDiagnosis(allRounds, WEST_SUSSEX);
    if (diag) await createDiagnosis.mutateAsync(diag);
  }

  // Future-date warning
  const future = date > todayISO();

  return (
    <div className="space-y-8 pb-72">
      <header className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <h2 className="font-display italic ink" style={{ fontSize: "32px" }} data-testid="text-logger-title">
            {editId ? "Edit round" : "Log a round"}
          </h2>
          <p className="ink-muted font-ui text-sm">
            {filledCount} / 18 holes scored.
            {filledCount > 0 && complete && <> Total <span className="font-mono-pro ink">{playedSum}</span> ({playedSum - COURSE_PAR >= 0 ? "+" : ""}{playedSum - COURSE_PAR}).</>}
            {filledCount > 0 && !complete && <> Played total <span className="font-mono-pro ink">{playedSum}</span> ({playedSum - playedPar >= 0 ? "+" : ""}{playedSum - playedPar} vs par for those holes).</>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setLocation("/")}
            className="px-4 py-2 rounded-[2px] border border-rule text-sm font-ui ink-muted hover:ink hover-elevate"
            data-testid="button-cancel"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!canSave || createRound.isPending || updateRound.isPending}
            onClick={handleSave}
            className="px-5 py-2 rounded-[2px] bg-[color:var(--ink-accent)] text-[color:var(--paper)] text-sm font-ui hover-elevate disabled:opacity-40 disabled:cursor-not-allowed"
            data-testid="button-save"
          >
            {editId
              ? "Save changes"
              : complete
              ? "Save round"
              : isPartial
              ? `Save partial round (${filledCount} ${filledCount === 1 ? "hole" : "holes"})`
              : "Save round"}
          </button>
        </div>
      </header>

      {isPartial && (
        <p className="-mt-4 text-xs font-ui ink-muted" data-testid="text-partial-caption">
          Partial rounds count toward hole averages and the Diagnosis but not toward your scoring average or handicap.
        </p>
      )}

      <section className="paper-card p-5 sm:p-7 grid sm:grid-cols-3 gap-5">
        <label className="block">
          <span className="small-caps text-[11px] ink-muted">Date</span>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            data-testid="input-date"
            className="mt-1 w-full bg-paper-deep border border-rule rounded-[2px] px-3 py-2 font-mono-pro text-sm ink"
          />
          {future && (
            <span className="block mt-1 text-[11px] status-mid-fg font-ui">Date is in the future — that's OK if you're scoring as you play.</span>
          )}
        </label>
        <label className="block">
          <span className="small-caps text-[11px] ink-muted">Partners</span>
          <input
            type="text"
            value={partners}
            onChange={(e) => setPartners(e.target.value)}
            placeholder="e.g. James, Charlotte"
            data-testid="input-partners"
            className="mt-1 w-full bg-paper-deep border border-rule rounded-[2px] px-3 py-2 font-ui text-sm ink"
          />
        </label>
        <div className="block">
          <span className="small-caps text-[11px] ink-muted">Tees</span>
          <div
            role="radiogroup"
            aria-label="Tees"
            className="mt-1 inline-flex w-full border border-rule rounded-[2px] overflow-hidden bg-paper-deep"
            data-testid="toggle-tees"
          >
            {(["white", "yellow"] as Tees[]).map((t) => {
              const on = tees === t;
              return (
                <button
                  key={t}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => setTees(t)}
                  data-testid={`button-tees-${t}`}
                  className={
                    "flex-1 px-3 py-2 font-ui text-sm capitalize " +
                    (on
                      ? "bg-[color:var(--ink-accent)] text-[color:var(--paper)]"
                      : "ink-muted hover:ink hover-elevate")
                  }
                >
                  {t}
                </button>
              );
            })}
          </div>
          {editId && originalTees && tees !== originalTees && (
            <span className="block mt-1 text-[11px] status-mid-fg font-ui" data-testid="text-tees-changed-warning">
              Changing tees recalculates the handicap differential for this round.
            </span>
          )}
        </div>
        <label className="block sm:col-span-3">
          <span className="small-caps text-[11px] ink-muted">Notes</span>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="Wind, condition, anything to remember…"
            data-testid="input-notes"
            className="mt-1 w-full bg-paper-deep border border-rule rounded-[2px] px-3 py-2 font-ui text-sm ink resize-none"
          />
        </label>
      </section>

      <section className="paper-card divide-y divide-[color:var(--rule)]">
        {WEST_SUSSEX.map((c) => {
          const h = holes.find((x) => x.hole === c.hole)!;
          const isActive = activeHole === c.hole;
          const tagsOpen = openTagsFor === c.hole;
          return (
            <div
              key={c.hole}
              data-hole-row={c.hole}
              data-testid={`row-hole-${c.hole}`}
              className={"px-4 sm:px-6 py-3 flex flex-col " + (isActive ? "bg-paper-deep" : "")}
            >
              <div className="flex items-center gap-3">
                <span className="w-8 font-display italic text-2xl ink leading-none" style={{ minWidth: "32px" }}>{c.hole}</span>
                <span className="small-caps text-[11px] ink-muted w-24 shrink-0 hidden sm:inline" data-testid={`text-yards-${c.hole}`}>par {c.par} · {c.yards[tees]}y</span>
                <span className="small-caps text-[11px] ink-muted w-20 shrink-0 sm:hidden" data-testid={`text-yards-mobile-${c.hole}`}>par {c.par} · {c.yards[tees]}y</span>

                <button
                  type="button"
                  onClick={() => { setActiveHole(c.hole); setShowXInput(false); }}
                  data-testid={`box-score-${c.hole}`}
                  aria-label={`Score for hole ${c.hole}`}
                  className={
                    "ml-auto w-14 h-12 sm:w-16 sm:h-12 rounded-[2px] border flex items-center justify-center font-mono-pro text-lg " +
                    (isActive
                      ? "border-[color:var(--ink-accent)] bg-paper ring-1 ring-[color:var(--ink-accent)]"
                      : "border-rule bg-paper hover-elevate")
                  }
                >
                  {h.score ?? <span className="ink-muted text-base">—</span>}
                </button>

                <button
                  type="button"
                  onClick={() => setOpenTagsFor(tagsOpen ? null : c.hole)}
                  data-testid={`button-tags-${c.hole}`}
                  className="ml-2 px-2 py-1 text-[11px] font-ui rounded-[2px] border border-rule ink-muted hover:ink hover-elevate"
                  aria-expanded={tagsOpen}
                >
                  Tags{h.tags.length > 0 && <> · <span className="font-mono-pro">{h.tags.length}</span></>}
                </button>
              </div>
              {tagsOpen && (
                <div className="mt-3 ml-11 flex flex-wrap gap-2 reveal">
                  {HOLE_TAGS.map((t) => {
                    const on = h.tags.includes(t.id);
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => toggleTag(c.hole, t.id)}
                        data-testid={`chip-tag-${t.id}-${c.hole}`}
                        aria-pressed={on}
                        className={
                          "px-2.5 py-1 text-[11px] rounded-[2px] border font-ui " +
                          (on
                            ? "bg-[color:var(--ink-accent)] text-[color:var(--paper)] border-[color:var(--ink-accent)]"
                            : "border-rule ink-muted hover:ink hover-elevate")
                        }
                      >
                        {t.label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </section>

      {/* Number pad */}
      {activeHole !== null && (
        <div
          className="fixed left-0 right-0 bottom-0 z-40 border-t border-rule bg-paper"
          style={{ boxShadow: "0 -8px 24px -16px rgba(42,38,24,0.18)" }}
          role="dialog"
          aria-label={`Score keypad for hole ${activeHole}`}
        >
          <div className="max-w-[1240px] mx-auto px-4 sm:px-8 py-3 sm:py-4">
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="font-ui text-xs ink-muted">
                Hole <span className="font-mono-pro ink">{activeHole}</span> · par <span className="font-mono-pro ink">{WEST_SUSSEX[activeHole - 1].par}</span>
              </span>
              <div className="flex gap-2">
                {holes.find((h) => h.hole === activeHole)?.score != null && (
                  <button
                    onClick={() => { setScore(activeHole, null); }}
                    className="px-3 py-1.5 text-xs font-ui ink-muted border border-rule rounded-[2px] hover:ink"
                    data-testid="button-pad-clear"
                  >
                    Clear
                  </button>
                )}
                <button
                  onClick={() => { setActiveHole(null); setShowXInput(false); }}
                  className="px-3 py-1.5 text-xs font-ui ink-muted border border-rule rounded-[2px] hover:ink"
                  data-testid="button-pad-close"
                >
                  Close
                </button>
              </div>
            </div>
            {!showXInput ? (
              <div className="grid grid-cols-6 sm:grid-cols-11 gap-2">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                  <button
                    key={n}
                    onClick={() => chooseScore(n)}
                    data-testid={`pad-${n}`}
                    className="h-12 rounded-[2px] border border-rule bg-paper-deep font-mono-pro text-lg ink hover-elevate"
                  >
                    {n}
                  </button>
                ))}
                <button
                  onClick={() => setShowXInput(true)}
                  data-testid="pad-X"
                  className="h-12 rounded-[2px] border border-rule bg-paper-deep font-mono-pro text-lg ink hover-elevate col-span-2 sm:col-span-1"
                >
                  X
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  max={20}
                  autoFocus
                  value={xInput}
                  onChange={(e) => setXInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") commitX();
                    if (e.key === "Escape") { setShowXInput(false); setXInput(""); }
                  }}
                  placeholder="11–20"
                  data-testid="input-pad-x"
                  className="h-12 flex-1 rounded-[2px] border border-rule bg-paper-deep px-3 font-mono-pro text-lg ink"
                />
                <button
                  onClick={commitX}
                  data-testid="button-pad-x-confirm"
                  className="h-12 px-4 rounded-[2px] bg-[color:var(--ink-accent)] text-[color:var(--paper)] font-ui text-sm hover-elevate"
                >
                  Set
                </button>
                <button
                  onClick={() => { setShowXInput(false); setXInput(""); }}
                  className="h-12 px-4 rounded-[2px] border border-rule font-ui text-sm ink-muted"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
