import type { StatusKind } from "@/lib/statistics";

const COLOR: Record<StatusKind, string> = {
  good: "var(--status-good)",
  mid: "var(--status-mid)",
  bad: "var(--status-bad)",
  none: "var(--status-none)",
};

const LABEL: Record<StatusKind, string> = {
  good: "scoring well",
  mid: "neutral",
  bad: "losing strokes",
  none: "insufficient data",
};

export function StatusDot({ status, size = 8 }: { status: StatusKind; size?: number }) {
  return (
    <span
      role="img"
      aria-label={LABEL[status]}
      className="inline-block rounded-full"
      style={{ width: size, height: size, background: COLOR[status] }}
    />
  );
}

export function statusVerdict(status: StatusKind): string {
  if (status === "good") return "Scoring well";
  if (status === "bad") return "Losing strokes";
  if (status === "none") return "Not enough data";
  return "Neutral";
}
