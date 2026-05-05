import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import { useRounds, useDiagnoses, useCreateDiagnosis } from "@/features/rounds/repository";
import { WEST_SUSSEX, COURSE_PAR } from "@/features/course/west-sussex";
import { runDiagnosis } from "@/features/diagnosis/engine";
import { daysBetween, nowISO } from "@/lib/date";
import { HoleTile } from "@/components/HoleTile";
import { computeHoleStats, scoringAverage, bestRound, squareColorByPar, statusFromDelta } from "@/lib/statistics";
import { handicapTrend } from "@/lib/handicap";
import { isFullRound, playedCount, roundTotal, roundParPlayed } from "@/lib/round";
import { shortBritish, longBritish } from "@/lib/date";
import { statusVerdict } from "@/components/StatusDot";

export default function Dashboard() {
  const { data: rounds = [], isLoading } = useRounds();
  const { data: diagnoses = [] } = useDiagnoses();
  const createDiag = useCreateDiagnosis();
  const [active, setActive] = useState<number | null>(null);
  const triggeredRef = useRef(false);

  // Auto-run the diagnosis engine when eligible. Persists once per 7 days.
  useEffect(() => {
    if (triggeredRef.current) return;
    const eligible = rounds.filter((r) => playedCount(r) >= 1);
    if (eligible.length < 10) return;
    const latest = diagnoses[0];
    if (latest && daysBetween(latest.generatedAt, nowISO()) < 7) return;
    const diag = runDiagnosis(rounds, WEST_SUSSEX);
    if (diag) {
      triggeredRef.current = true;
      createDiag.mutate(diag);
    }
  }, [rounds, diagnoses, createDiag]);

  const stats = computeHoleStats(rounds, WEST_SUSSEX);
  const front = stats.slice(0, 9);
  const back = stats.slice(9, 18);

  const avg = scoringAverage(rounds);
  const best = bestRound(rounds);
  const hcp = handicapTrend(rounds);
  const fullCount = rounds.filter(isFullRound).length;
  const partialCount = rounds.length - fullCount;

  const activeStat = active ? stats.find((s) => s.hole === active) : null;
  const activeCourse = active ? WEST_SUSSEX.find((c) => c.hole === active) : null;

  const recent = [...rounds]
    .sort((a, b) => {
      if (a.date !== b.date) return b.date.localeCompare(a.date);
      return b.createdAt.localeCompare(a.createdAt);
    })
    .slice(0, 4);

  const latestDiagnosis = diagnoses[0] ?? null;

  if (isLoading) {
    return <div className="font-ui ink-muted">Loading…</div>;
  }

  // Empty state
  if (rounds.length === 0) {
    return (
      <div className="space-y-12">
        <section className="paper-card p-10 sm:p-16 text-center">
          <p className="font-display italic text-2xl sm:text-3xl ink leading-snug max-w-xl mx-auto">
            Log five rounds and we'll start showing you where your strokes go.
          </p>
          <p className="mt-4 ink-muted font-ui text-sm">A blank scorecard, in the best sense.</p>
          <div className="mt-8">
            <Link href="/log">
              <a
                data-testid="link-log-empty"
                className="inline-flex items-center px-5 py-3 rounded-[2px] bg-[color:var(--ink-accent)] text-[color:var(--paper)] font-ui text-sm hover-elevate"
              >
                Log today's round
              </a>
            </Link>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      {/* Stat strip */}
      <section className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <StatCell
          label="Rounds"
          value={String(rounds.length)}
          suffix={partialCount > 0 ? `${fullCount} full` : undefined}
        />
        <StatCell
          label="Scoring average"
          value={avg !== null ? avg.toFixed(1) : "—"}
          suffix={avg === null ? "Needs full rounds" : undefined}
        />
        <StatCell
          label="Best round"
          value={best ? String(best.total) : "—"}
          suffix={best ? shortBritish(best.date) : (fullCount === 0 ? "Needs full rounds" : undefined)}
        />
        <StatCell
          label="Handicap trend"
          value={hcp !== null ? hcp.toFixed(1) : "—"}
          suffix={hcp === null ? `${Math.max(0, 5 - fullCount)} more full ${5 - fullCount === 1 ? "round" : "rounds"}` : undefined}
        />
      </section>

      {/* The Card */}
      <section className="paper-card p-5 sm:p-8" data-testid="section-card">
        <CardRow label="Out" stats={front} active={active} setActive={setActive} />
        <div className="my-5 sm:my-7 border-t border-rule" />
        <CardRow label="In" stats={back} active={active} setActive={setActive} />
        <div className="mt-5 sm:mt-7 pt-4 border-t border-rule flex flex-wrap items-center justify-between text-xs font-ui ink-muted">
          <span className="small-caps">Course par {COURSE_PAR}</span>
          <span className="small-caps">West Sussex Golf Club · yardages from white</span>
        </div>
      </section>

      {/* Hole detail panel */}
      {active && activeStat && activeCourse && (
        <section
          className="paper-card p-6 sm:p-8 reveal"
          data-testid="panel-hole-detail"
          aria-live="polite"
        >
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <div className="font-display italic ink" style={{ fontSize: "26px" }}>
              Hole {activeCourse.hole} <span className="ink-muted">·</span> par {activeCourse.par} <span className="ink-muted">·</span> White {activeCourse.yards.white}y <span className="ink-muted">·</span> Yellow {activeCourse.yards.yellow}y
            </div>
            <button
              onClick={() => setActive(null)}
              className="text-xs font-ui ink-muted hover:ink"
              data-testid="button-close-hole"
            >
              Close
            </button>
          </div>
          <p className="mt-3 font-display italic ink-soft leading-relaxed" style={{ fontSize: "17px" }}>
            {activeCourse.designNote}
          </p>

          <div className="mt-6 grid sm:grid-cols-2 gap-6">
            <div>
              <div className="small-caps text-[11px] ink-muted mb-2">Last 5</div>
              <div className="flex gap-1.5">
                {activeStat.recent.length === 0 ? (
                  <span className="text-xs ink-muted font-ui">No scores yet.</span>
                ) : (
                  activeStat.recent.map((s, i) => {
                    const c = squareColorByPar(s, activeCourse.par);
                    const bg = c === "good" ? "var(--status-good)" : c === "mid" ? "var(--status-mid)" : "var(--status-bad)";
                    return (
                      <span
                        key={i}
                        className="inline-flex items-center justify-center w-7 h-7 rounded-[2px] font-mono-pro text-xs text-[color:var(--paper)]"
                        style={{ background: bg }}
                        title={`Score ${s}`}
                      >
                        {s}
                      </span>
                    );
                  })
                )}
              </div>
            </div>
            <div>
              <div className="small-caps text-[11px] ink-muted mb-2">Verdict</div>
              <div className="font-ui text-sm ink">{statusVerdict(activeStat.status)}</div>
              {activeStat.delta != null && rounds.length >= 5 && (
                <div className="mt-1 font-mono-pro text-xs ink-muted">
                  {activeStat.delta > 0 ? "+" : ""}
                  {activeStat.delta.toFixed(1)} strokes/round vs expected
                </div>
              )}
              <div className="mt-2 font-ui text-xs ink-muted">
                {activeStat.count} {activeStat.count === 1 ? "score logged" : "scores logged"}.
                {activeStat.average !== null && <> Average <span className="font-mono-pro">{activeStat.average.toFixed(1)}</span>.</>}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Diagnosis */}
      <section className="paper-card p-7 sm:p-10" data-testid="section-diagnosis">
        {latestDiagnosis ? (
          <>
            <div className="small-caps text-[11px] ink-muted">
              Window {shortBritish(latestDiagnosis.windowStart)} — {shortBritish(latestDiagnosis.windowEnd)}
            </div>
            <h2
              className="mt-2 font-display italic ink leading-tight"
              style={{ fontSize: "clamp(22px, 2.4vw, 28px)" }}
              data-testid="text-diagnosis-headline"
            >
              {latestDiagnosis.headline}
            </h2>
            <p
              className="mt-4 font-display ink leading-[1.6] max-w-3xl"
              style={{ fontSize: "17px", fontWeight: 400 }}
              data-testid="text-diagnosis-body"
            >
              {latestDiagnosis.body}
            </p>
          </>
        ) : (
          <p className="font-display italic ink-soft" style={{ fontSize: "20px" }}>
            {rounds.length >= 10
              ? "Diagnosis is being prepared. Refresh in a moment."
              : `Log ${Math.max(0, 10 - rounds.length)} more ${10 - rounds.length === 1 ? "round" : "rounds"} and we’ll start showing you the patterns.`}
          </p>
        )}
      </section>

      {/* Recent rounds */}
      <section data-testid="section-recent">
        <h3 className="small-caps text-[11px] ink-muted mb-3">Recent rounds</h3>
        <ul className="divide-y divide-[color:var(--rule)] border-t border-b border-rule">
          {recent.map((r) => {
            const full = isFullRound(r);
            const t = roundTotal(r);
            const par = full ? COURSE_PAR : roundParPlayed(r, WEST_SUSSEX);
            const diff = t - par;
            const played = playedCount(r);
            return (
              <li key={r.id}>
                <Link href={`/round/${r.id}`}>
                  <a
                    data-testid={`link-round-${r.id}`}
                    className="flex items-center justify-between gap-4 px-2 py-3 hover:bg-paper"
                  >
                    <span className="font-ui text-sm ink-muted w-20 shrink-0">{shortBritish(r.date)}</span>
                    <span className="font-ui text-sm ink truncate flex-1">{r.partners || <em className="ink-muted">solo</em>}</span>
                    <TeePill tees={r.tees} />
                    <span className="font-mono-pro text-sm ink">
                      {t}
                      {full ? (
                        <span className="ml-2 ink-muted">
                          ({diff >= 0 ? `+${diff}` : diff})
                        </span>
                      ) : (
                        <span className="ml-2 ink-muted">· {played} {played === 1 ? "hole" : "holes"}</span>
                      )}
                    </span>
                  </a>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      {/* CTA */}
      <div className="text-center pt-4">
        <Link href="/log">
          <a
            data-testid="link-log-cta"
            className="inline-flex items-center px-5 py-3 rounded-[2px] bg-[color:var(--ink-accent)] text-[color:var(--paper)] font-ui text-sm hover-elevate"
          >
            Log today's round
          </a>
        </Link>
      </div>
    </div>
  );
}

function TeePill({ tees }: { tees: "white" | "yellow" }) {
  const isYellow = tees === "yellow";
  return (
    <span
      data-testid={`pill-tees-${tees}`}
      title={`${isYellow ? "Yellow" : "White"} tees`}
      className={
        "inline-flex items-center justify-center w-5 h-5 rounded-full font-mono-pro text-[10px] border " +
        (isYellow
          ? "bg-[#E5C634] text-[color:var(--ink)] border-[#B89A1C]"
          : "bg-[color:var(--paper)] text-[color:var(--ink)] border-[color:var(--ink-muted)]")
      }
    >
      {isYellow ? "Y" : "W"}
    </span>
  );
}

function StatCell({ label, value, suffix }: { label: string; value: string; suffix?: string }) {
  return (
    <div className="paper-card px-4 py-4 sm:py-5">
      <div className="small-caps text-[10px] ink-muted">{label}</div>
      <div className="mt-1 font-mono-pro text-2xl sm:text-3xl ink leading-none" style={{ fontFeatureSettings: "'tnum' 1" }}>
        {value}
      </div>
      {suffix && <div className="mt-2 text-[11px] ink-muted font-ui">{suffix}</div>}
    </div>
  );
}

function CardRow({
  label,
  stats,
  active,
  setActive,
}: {
  label: string;
  stats: ReturnType<typeof computeHoleStats>;
  active: number | null;
  setActive: (h: number | null) => void;
}) {
  return (
    <div>
      <div className="small-caps text-[11px] ink-muted mb-2">{label}</div>
      <div className="grid grid-cols-9 gap-1 sm:gap-2">
        {stats.map((s) => {
          const c = WEST_SUSSEX.find((h) => h.hole === s.hole)!;
          return (
            <HoleTile
              key={s.hole}
              course={c}
              stat={s}
              active={active === s.hole}
              onClick={() => setActive(active === s.hole ? null : s.hole)}
            />
          );
        })}
      </div>
    </div>
  );
}
