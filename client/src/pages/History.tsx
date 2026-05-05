import { Link } from "wouter";
import { useRounds } from "@/features/rounds/repository";
import { COURSE_PAR, WEST_SUSSEX } from "@/features/course/west-sussex";
import { isFullRound, playedCount, roundTotal, roundParPlayed } from "@/lib/round";
import { longBritish } from "@/lib/date";

export default function History() {
  const { data: rounds = [], isLoading } = useRounds();

  if (isLoading) return <div className="font-ui ink-muted">Loading…</div>;

  if (rounds.length === 0) {
    return (
      <section className="paper-card p-10 text-center">
        <p className="font-display italic text-2xl ink">No rounds yet.</p>
        <p className="mt-2 ink-muted font-ui text-sm">Your first card lives at /log.</p>
      </section>
    );
  }

  const sorted = [...rounds].sort((a, b) => {
    if (a.date !== b.date) return b.date.localeCompare(a.date);
    return b.createdAt.localeCompare(a.createdAt);
  });

  return (
    <div className="space-y-6">
      <header>
        <h2 className="font-display italic ink" style={{ fontSize: "32px" }}>History</h2>
        <p className="ink-muted font-ui text-sm">
          {rounds.length} {rounds.length === 1 ? "round" : "rounds"} kept.
        </p>
      </header>

      <ul className="paper-card divide-y divide-[color:var(--rule)]">
        {sorted.map((r) => {
          const full = isFullRound(r);
          const t = roundTotal(r);
          const par = full ? COURSE_PAR : roundParPlayed(r, WEST_SUSSEX);
          const diff = t - par;
          const played = playedCount(r);
          const tagCount = r.holes.reduce((s, h) => s + h.tags.length, 0);
          const isYellow = r.tees === "yellow";
          return (
            <li key={r.id}>
              <Link href={`/round/${r.id}`}>
                <a
                  data-testid={`row-history-${r.id}`}
                  className="grid grid-cols-[110px_1fr_auto] sm:grid-cols-[140px_1fr_120px_auto] gap-3 sm:gap-4 px-5 py-4 hover:bg-paper-deep items-center"
                >
                  <span className="font-mono-pro text-sm ink">{longBritish(r.date)}</span>
                  <span className="font-ui text-sm ink truncate">
                    {r.partners || <em className="ink-muted">solo</em>}
                  </span>
                  <span className="hidden sm:inline font-ui text-xs ink-muted">
                    {tagCount} {tagCount === 1 ? "tag" : "tags"}
                  </span>
                  <span className="font-mono-pro text-sm ink text-right inline-flex items-center justify-end gap-2">
                    <span
                      data-testid={`pill-tees-${r.id}`}
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
                    <span>
                      {t} <span className="ink-muted">({diff >= 0 ? `+${diff}` : diff})</span>
                      {!full && (
                        <span className="ml-2 ink-muted font-ui text-xs" data-testid={`badge-partial-${r.id}`}>
                          {played} {played === 1 ? "hole" : "holes"}
                        </span>
                      )}
                    </span>
                  </span>
                </a>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
