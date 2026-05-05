import { useRef, useState } from "react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { WEST_SUSSEX, COURSE_PAR, COURSE_YARDS_WHITE, COURSE_YARDS_YELLOW, TEE_RATINGS } from "@/features/course/west-sussex";

export default function Settings() {
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [importPayload, setImportPayload] = useState<any | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);

  async function handleExport() {
    const res = await apiRequest("GET", "/api/export");
    const data = await res.json();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const today = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `west-sussex-companion-${today}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast({ title: "Export started", duration: 2000 });
  }

  async function onFileChosen(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    try {
      const parsed = JSON.parse(text);
      if (!Array.isArray(parsed.rounds)) throw new Error("rounds[] missing");
      setImportPayload(parsed);
    } catch (err: any) {
      toast({ title: "Could not read file", description: err.message, variant: "destructive" });
    }
    e.target.value = "";
  }

  async function confirmImport() {
    if (!importPayload) return;
    await apiRequest("POST", "/api/import", {
      rounds: importPayload.rounds,
      diagnoses: importPayload.diagnoses,
      meta: importPayload.meta,
    });
    setImportPayload(null);
    queryClient.invalidateQueries();
    toast({ title: "Import complete", duration: 2000 });
  }

  async function clearAll() {
    await apiRequest("POST", "/api/clear");
    queryClient.invalidateQueries();
    setConfirmClear(false);
    toast({ title: "All data cleared", duration: 2000 });
  }

  return (
    <div className="space-y-10">
      <header>
        <h2 className="font-display italic ink" style={{ fontSize: "32px" }}>Settings</h2>
        <p className="ink-muted font-ui text-sm">Backups, course details, and the cleanup button.</p>
      </header>

      <section className="paper-card p-6 sm:p-7 space-y-3">
        <h3 className="small-caps text-[11px] ink-muted">Backup</h3>
        <p className="font-display italic ink-soft" style={{ fontSize: "16px" }}>
          The app keeps your rounds in a small database. Export a JSON file any time, then import it on another device.
        </p>
        <div className="flex flex-wrap gap-3 pt-2">
          <button
            onClick={handleExport}
            data-testid="button-export"
            className="px-4 py-2 rounded-[2px] bg-[color:var(--ink-accent)] text-[color:var(--paper)] font-ui text-sm hover-elevate"
          >
            Export JSON
          </button>
          <button
            onClick={() => fileRef.current?.click()}
            data-testid="button-import"
            className="px-4 py-2 rounded-[2px] border border-rule font-ui text-sm ink hover-elevate"
          >
            Import JSON
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            onChange={onFileChosen}
            className="hidden"
            data-testid="input-import-file"
          />
        </div>
      </section>

      <section className="paper-card p-6 sm:p-7" data-testid="section-course-info">
        <h3 className="small-caps text-[11px] ink-muted">Course</h3>
        <p className="font-display italic ink mt-2" style={{ fontSize: "20px" }}>
          West Sussex Golf Club
        </p>
        <p className="ink-muted font-ui text-sm">
          Course rating · slope: White <span className="font-mono-pro ink">{TEE_RATINGS.white.rating}</span> · <span className="font-mono-pro ink">{TEE_RATINGS.white.slope}</span>, Yellow <span className="font-mono-pro ink">{TEE_RATINGS.yellow.rating}</span> · <span className="font-mono-pro ink">{TEE_RATINGS.yellow.slope}</span>
        </p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm font-ui" data-testid="table-course-info">
            <thead>
              <tr className="small-caps text-[10px] ink-muted text-right">
                <th className="py-1.5 pr-3 text-left">Hole</th>
                <th className="py-1.5 px-3">Par</th>
                <th className="py-1.5 px-3">SI</th>
                <th className="py-1.5 px-3">White</th>
                <th className="py-1.5 pl-3">Yellow</th>
              </tr>
            </thead>
            <tbody>
              {WEST_SUSSEX.map((h) => (
                <tr key={h.hole} className="text-right border-b border-[color:var(--rule)]/60">
                  <td className="py-1.5 pr-3 text-left font-mono-pro ink">{String(h.hole).padStart(2, "0")}</td>
                  <td className="py-1.5 px-3 font-mono-pro ink">{h.par}</td>
                  <td className="py-1.5 px-3 font-mono-pro ink-muted">{h.strokeIndex}</td>
                  <td className="py-1.5 px-3 font-mono-pro ink">{h.yards.white}</td>
                  <td className="py-1.5 pl-3 font-mono-pro ink">{h.yards.yellow}</td>
                </tr>
              ))}
              <tr className="text-right small-caps text-[10px] ink-muted">
                <td className="pt-3 pr-3 text-left">Total</td>
                <td className="pt-3 px-3 font-mono-pro ink" data-testid="text-total-par">{COURSE_PAR}</td>
                <td className="pt-3 px-3">—</td>
                <td className="pt-3 px-3 font-mono-pro ink" data-testid="text-total-white">{COURSE_YARDS_WHITE.toLocaleString()}</td>
                <td className="pt-3 pl-3 font-mono-pro ink" data-testid="text-total-yellow">{COURSE_YARDS_YELLOW.toLocaleString()}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="paper-card p-6 sm:p-7 border-l-2 border-l-[color:var(--status-bad)]">
        <h3 className="small-caps text-[11px] ink-muted">Danger zone</h3>
        <p className="ink-muted font-ui text-sm mt-2">
          Clearing removes every round, diagnosis, and saved draft. There is no undo.
        </p>
        <div className="mt-4">
          <button
            onClick={() => setConfirmClear(true)}
            data-testid="button-clear-all"
            className="px-4 py-2 rounded-[2px] border border-[color:var(--status-bad)] text-[color:var(--status-bad)] font-ui text-sm hover-elevate"
          >
            Clear all data
          </button>
        </div>
      </section>

      <section>
        <h3 className="small-caps text-[11px] ink-muted">About</h3>
        <p className="mt-2 font-ui text-sm ink-muted">
          The West Sussex Companion <span className="font-mono-pro ink">v1.0.0</span> — built May 2026. Online sync.
        </p>
      </section>

      {importPayload && (
        <div role="dialog" aria-modal className="fixed inset-0 z-50 grid place-items-center bg-[rgba(42,38,24,0.4)] px-4">
          <div className="paper-card p-6 max-w-md w-full">
            <h3 className="font-display italic ink" style={{ fontSize: "22px" }}>Import this file?</h3>
            <p className="mt-2 ink-muted font-ui text-sm">
              This will replace all current data with the contents of the file ({importPayload.rounds?.length ?? 0} rounds).
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setImportPayload(null)}
                className="px-4 py-2 rounded-[2px] border border-rule font-ui text-sm ink"
              >
                Cancel
              </button>
              <button
                onClick={confirmImport}
                data-testid="button-confirm-import"
                className="px-4 py-2 rounded-[2px] bg-[color:var(--ink-accent)] text-[color:var(--paper)] font-ui text-sm"
              >
                Replace data
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmClear && (
        <div role="dialog" aria-modal className="fixed inset-0 z-50 grid place-items-center bg-[rgba(42,38,24,0.4)] px-4">
          <div className="paper-card p-6 max-w-md w-full">
            <h3 className="font-display italic ink" style={{ fontSize: "22px" }}>Clear all data?</h3>
            <p className="mt-2 ink-muted font-ui text-sm">Every round, diagnosis, and draft will be deleted.</p>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setConfirmClear(false)} className="px-4 py-2 rounded-[2px] border border-rule font-ui text-sm ink">
                Cancel
              </button>
              <button onClick={clearAll} data-testid="button-confirm-clear" className="px-4 py-2 rounded-[2px] bg-[color:var(--status-bad)] text-[color:var(--paper)] font-ui text-sm">
                Clear everything
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
