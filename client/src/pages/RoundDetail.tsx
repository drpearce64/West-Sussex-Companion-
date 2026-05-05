import { useState } from "react";
import { useRoute, useLocation, Link } from "wouter";
import { useRound, useDeleteRound } from "@/features/rounds/repository";
import { WEST_SUSSEX, COURSE_PAR, FRONT_PAR, BACK_PAR } from "@/features/course/west-sussex";
import { HOLE_TAGS } from "@/features/rounds/types";
import { isFullRound, playedCount, roundTotal, roundParPlayed } from "@/lib/round";
import { longBritish } from "@/lib/date";
import { useToast } from "@/hooks/use-toast";

const TAG_LABELS = Object.fromEntries(HOLE_TAGS.map((t) => [t.id, t.label]));

export default function RoundDetail() {
  const [, params] = useRoute<{ id: string }>("/round/:id");
  const id = params?.id;
  const { data: round, isLoading } = useRound(id);
  const del = useDeleteRound();
  const [, setLocation] = useLocation();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const { toast } = useToast();

  if (isLoading) return <div className="font-ui ink-muted">Loading…</div>;
  if (!round) {
    return (
      <section className="paper-card p-10 text-center">
        <p className="font-display italic text-2xl ink">Round not found.</p>
      </section>
    );
  }

  const full = isFullRound(round);
  const total = roundTotal(round);
  const par = full ? COURSE_PAR : roundParPlayed(round, WEST_SUSSEX);
  const diff = total - par;
  const played = playedCount(round);
  const front = round.holes.slice(0, 9);
  const back = round.holes.slice(9, 18);
  const frontPlayed = front.filter((h) => typeof h.score === "number" && h.score > 0);
  const backPlayed = back.filter((h) => typeof h.score === "number" && h.score > 0);
  const frontTotal = frontPlayed.reduce((s, h) => s + (h.score as number), 0);
  const backTotal = backPlayed.reduce((s, h) => s + (h.score as number), 0);
  const frontPar = frontPlayed.reduce((s, h) => {
    const c = WEST_SUSSEX.find((x) => x.hole === h.hole);
    return s + (c?.par ?? 0);
  }, 0);
  const backPar = backPlayed.reduce((s, h) => {
    const c = WEST_SUSSEX.find((x) => x.hole === h.hole);
    return s + (c?.par ?? 0);
  }, 0);
  const frontIsFull = frontPlayed.length === 9;
  const backIsFull = backPlayed.length === 9;

  async function handleDelete() {
    await del.mutateAsync(id!);
    toast({ title: "Round deleted", duration: 2000 });
    setLocation("/history");
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-baseline justify-between gap-4">
        <div>
          <h2 className="font-display italic ink" style={{ fontSize: "32px" }}>
            {longBritish(round.date)}
          </h2>
          <p className="mt-1 ink-muted font-ui text-sm flex items-center gap-2 flex-wrap">
            <span
              data-testid="badge-round-tees"
              className={
                "inline-flex items-center px-2 py-0.5 rounded-[2px] text-[11px] font-ui border " +
                (round.tees === "yellow"
                  ? "bg-[#E5C634] text-[color:var(--ink)] border-[#B89A1C]"
                  : "bg-[color:var(--paper)] text-[color:var(--ink)] border-[color:var(--ink-muted)]")
              }
            >
              {round.tees === "yellow" ? "Yellow tees" : "White tees"}
            </span>
            <span>{round.partners || <em>solo</em>}</span>
          </p>
          {round.notes && (
            <p className="mt-3 font-display italic ink-soft max-w-2xl" style={{ fontSize: "17px" }}>
              {round.notes}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="font-mono-pro text-3xl ink leading-none">{total}</div>
            <div className="mt-1 small-caps text-[11px] ink-muted">
              {full ? (
                <>({diff >= 0 ? `+${diff}` : diff}) vs par {COURSE_PAR}</>
              ) : (
                <>({diff >= 0 ? `+${diff}` : diff}) · {played} {played === 1 ? "hole" : "holes"}</>
              )}
            </div>
          </div>
        </div>
      </header>

      <section className="paper-card p-5 sm:p-7">
        <NineGrid label="Out" holes={front} subtotal={frontTotal} par={frontIsFull ? FRONT_PAR : frontPar} isFullNine={frontIsFull} />
        <div className="my-5 border-t border-rule" />
        <NineGrid label="In" holes={back} subtotal={backTotal} par={backIsFull ? BACK_PAR : backPar} isFullNine={backIsFull} />
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <Link href={`/log?id=${id}`}>
          <a
            data-testid="link-edit-round"
            className="px-4 py-2 rounded-[2px] border border-rule font-ui text-sm ink hover-elevate"
          >
            Edit
          </a>
        </Link>
        <button
          onClick={() => setConfirmOpen(true)}
          data-testid="button-delete-round"
          className="px-4 py-2 rounded-[2px] border border-[color:var(--status-bad)] text-[color:var(--status-bad)] font-ui text-sm hover-elevate"
        >
          Delete
        </button>
        <Link href="/history">
          <a className="ml-auto text-sm font-ui ink-muted hover:ink">Back to history</a>
        </Link>
      </div>

      {confirmOpen && (
        <div role="dialog" aria-modal className="fixed inset-0 z-50 grid place-items-center bg-[rgba(42,38,24,0.4)] px-4">
          <div className="paper-card p-6 max-w-md w-full">
            <h3 className="font-display italic ink" style={{ fontSize: "22px" }}>Delete this round?</h3>
            <p className="mt-2 ink-muted font-ui text-sm">This cannot be undone.</p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setConfirmOpen(false)}
                className="px-4 py-2 rounded-[2px] border border-rule font-ui text-sm ink"
              >
                Keep it
              </button>
              <button
                onClick={handleDelete}
                data-testid="button-confirm-delete"
                className="px-4 py-2 rounded-[2px] bg-[color:var(--status-bad)] text-[color:var(--paper)] font-ui text-sm"
              >
                Delete round
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function NineGrid({ label, holes, subtotal, par, isFullNine }: { label: string; holes: any[]; subtotal: number; par: number; isFullNine: boolean }) {
  const playedThisNine = holes.filter((h: any) => typeof h.score === "number" && h.score > 0).length;
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <div className="small-caps text-[11px] ink-muted">{label}</div>
        <div className="font-mono-pro text-sm ink-muted">
          {playedThisNine === 0 ? (
            <span>—</span>
          ) : (
            <>
              {subtotal}{" "}
              <span className="ink-muted">({subtotal - par >= 0 ? `+${subtotal - par}` : subtotal - par})</span>
              {!isFullNine && (
                <span className="ml-2 ink-muted text-xs font-ui">{playedThisNine} of 9</span>
              )}
            </>
          )}
        </div>
      </div>
      <div className="mt-3 grid grid-cols-9 gap-2">
        {holes.map((h) => {
          const c = WEST_SUSSEX.find((x) => x.hole === h.hole)!;
          const over = (h.score ?? c.par) - c.par;
          // tees-aware yards from the parent NineGrid via context isn't set; fall back via a closure lookup later
          let bg = "var(--status-mid)";
          if (h.score == null) bg = "var(--status-none)";
          else if (over <= 0) bg = "var(--status-good)";
          else if (over === 1) bg = "var(--status-mid)";
          else bg = "var(--status-bad)";
          return (
            <div key={h.hole} className="flex flex-col items-center min-w-0">
              <div className="text-[10px] ink-muted font-ui">{h.hole}</div>
              <div
                className="mt-1 w-full aspect-square rounded-[2px] flex items-center justify-center font-mono-pro text-base text-[color:var(--paper)]"
                style={{ background: bg }}
              >
                {h.score ?? "—"}
              </div>
              <div className="mt-1 text-[10px] ink-muted font-ui">par {c.par}</div>
              {h.tags.length > 0 && (
                <div className="mt-1 text-[9px] ink-muted font-ui truncate w-full text-center" title={h.tags.map((t: string) => TAG_LABELS[t] || t).join(", ")}>
                  {h.tags.length} tag{h.tags.length > 1 ? "s" : ""}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
