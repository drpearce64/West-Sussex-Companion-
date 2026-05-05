import { StatusDot } from "./StatusDot";
import type { HoleStat, StatusKind } from "@/lib/statistics";
import type { CourseHole } from "@/features/rounds/types";

const STATUS_FG: Record<StatusKind, string> = {
  good: "var(--status-good)",
  mid: "var(--status-mid)",
  bad: "var(--status-bad)",
  none: "var(--ink-muted)",
};

export function HoleTile({
  course,
  stat,
  active,
  onClick,
}: {
  course: CourseHole;
  stat: HoleStat;
  active: boolean;
  onClick: () => void;
}) {
  const showAvg = stat.average !== null;
  return (
    <button
      type="button"
      onClick={onClick}
      data-testid={`tile-hole-${course.hole}`}
      aria-label={`Hole ${course.hole}, par ${course.par}, ${course.yards.white} yards from white`}
      aria-pressed={active}
      className={
        "tile-hover relative bg-paper border rounded-[2px] flex flex-col text-left p-1.5 sm:p-3 " +
        "min-h-[78px] sm:min-h-[96px] focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 " +
        (active
          ? "border-[color:var(--ink-accent)] ring-1 ring-[color:var(--ink-accent)]"
          : "border-rule hover:border-[color:var(--ink-muted)]")
      }
      style={{ minWidth: 0 }}
    >
      <div className="flex items-start justify-between gap-1">
        <span
          className="font-display italic ink leading-none"
          style={{ fontSize: "clamp(16px, 2.4vw, 30px)" }}
        >
          {course.hole}
        </span>
        <StatusDot status={stat.status} />
      </div>
      <div className="mt-0.5 sm:mt-1 small-caps text-[8px] sm:text-[10px] ink-muted font-ui leading-tight">
        <span className="hidden sm:inline">par {course.par} · {course.yards.white}y</span>
        <span className="sm:hidden">par {course.par}</span>
      </div>
      <div
        className="mt-auto font-mono-pro text-sm sm:text-lg leading-none"
        style={{ color: STATUS_FG[stat.status], fontFeatureSettings: "'tnum' 1" }}
        data-testid={`avg-hole-${course.hole}`}
      >
        {showAvg ? stat.average!.toFixed(1) : "—"}
      </div>
    </button>
  );
}
