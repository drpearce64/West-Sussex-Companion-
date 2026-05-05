import { Link, useLocation } from "wouter";
import { useRounds } from "@/features/rounds/repository";
import { longBritish } from "@/lib/date";

function Logo({ className = "" }: { className?: string }) {
  // A minimal heathland sprig — three sprigs rising from a baseline.
  return (
    <svg
      className={className}
      width="28"
      height="28"
      viewBox="0 0 32 32"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.25"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <line x1="4" y1="26" x2="28" y2="26" />
      <path d="M16 26 L16 8" />
      <path d="M16 14 L11 9" />
      <path d="M16 17 L21 11" />
      <path d="M16 20 L10 16" />
      <path d="M16 22 L22 18" />
    </svg>
  );
}

const NAV: { label: string; href: string }[] = [
  { label: "Dashboard", href: "/" },
  { label: "Log", href: "/log" },
  { label: "History", href: "/history" },
  { label: "Settings", href: "/settings" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { data: rounds = [] } = useRounds();

  // first round date (chronologically earliest)
  const firstDate = (() => {
    if (rounds.length === 0) return null;
    const sorted = [...rounds].sort((a, b) => a.date.localeCompare(b.date));
    return sorted[0].date;
  })();
  const keptSince = firstDate ? longBritish(firstDate) : "today";

  return (
    <div className="min-h-screen bg-canvas text-[color:var(--ink)]">
      <header className="border-b border-rule">
        <div className="max-w-[1240px] mx-auto px-6 sm:px-10 pt-10 pb-6">
          <div className="flex items-start gap-4">
            <span className="text-[color:var(--ink-accent)] mt-2"><Logo /></span>
            <div className="min-w-0">
              <h1
                className="font-display italic font-light tracking-tight leading-none ink"
                style={{ fontSize: "clamp(28px, 4.2vw, 42px)" }}
                data-testid="text-masthead"
              >
                The West Sussex Companion
              </h1>
              <div className="mt-2 text-sm ink-soft font-ui" data-testid="text-subhead">
                David Pearce <span className="px-1 ink-muted">·</span> kept since {keptSince}
              </div>
            </div>
          </div>

          <nav className="mt-6 flex flex-wrap items-center gap-1 text-sm font-ui" aria-label="Primary">
            {NAV.map((item) => {
              const active = item.href === "/" ? location === "/" : location.startsWith(item.href);
              return (
                <Link key={item.href} href={item.href}>
                  <a
                    data-testid={`nav-${item.label.toLowerCase()}`}
                    className={
                      "px-3 py-2 rounded-[2px] transition-colors " +
                      (active
                        ? "ink font-medium border border-rule bg-paper"
                        : "ink-muted hover:ink hover:bg-paper")
                    }
                  >
                    {item.label}
                  </a>
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      <main className="max-w-[1240px] mx-auto px-6 sm:px-10 py-10 pb-24">
        {children}
      </main>

      <footer className="border-t border-rule">
        <div className="max-w-[1240px] mx-auto px-6 sm:px-10 py-6 text-xs ink-muted font-ui flex flex-wrap items-center justify-between gap-2">
          <span>The West Sussex Companion</span>
          <span>Online sync · v1.0.0</span>
        </div>
      </footer>
    </div>
  );
}
