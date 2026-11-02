import Link from "next/link";
import { EVENT_CATALOG } from "@/lib/events";
import { funnelSnapshot } from "@/lib/funnel";

export const dynamic = "force-dynamic";
export const metadata = { title: "Funnel · Legion prototype" };

const pct = (n: number, d: number) => (d ? `${((n / d) * 100).toFixed(1)}%` : "—");

export default function FunnelPage() {
  const f = funnelSnapshot();
  const start = f.steps[0].count;
  const booked = f.steps.find((s) => s.key === "booked")!.count;
  const completed = f.steps.find((s) => s.key === "visit_completed")!.count;
  return (
    <main className="page w-920" style={{ gap: 24 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <span className="eb">Debug · funnel</span>
        <h1 className="h1">Start → first visit completed</h1>
        <p className="sub" style={{ fontSize: 15 }}>
          Counted once per person (phone + date of birth), not per browser session. In memory on this server instance since{" "}
          {new Date(f.since).toLocaleString("en-US", { timeZone: "America/Chicago" })} CT: resets on deploy, demo only.
        </p>
      </div>
      <div className="grid-2">
        <div className="card">
          <span className="mono">North star</span>
          <span style={{ fontSize: 32, fontWeight: 600 }} data-testid="north-star">{pct(completed, start)}</span>
          <span className="lbl">Start → first visit completed ({completed} of {start})</span>
        </div>
        <div className="card">
          <span className="mono">Primary</span>
          <span style={{ fontSize: 32, fontWeight: 600 }}>{pct(booked, start)}</span>
          <span className="lbl">Start → booked ({booked} of {start}). Guardrail booked → completed: {pct(completed, booked)}</span>
        </div>
      </div>
      <div className="card" style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
          <thead>
            <tr style={{ textAlign: "left" }} className="lbl">
              <th style={{ padding: "6px 8px" }}>Step</th>
              <th style={{ padding: "6px 8px" }}>People</th>
              <th style={{ padding: "6px 8px" }}>From previous</th>
              <th style={{ padding: "6px 8px" }}>From start</th>
            </tr>
          </thead>
          <tbody>
            {f.steps.map((s, i) => (
              <tr key={s.key} style={{ borderTop: "1px solid var(--line-soft)" }}>
                <td style={{ padding: "8px" }}>{s.label}</td>
                <td style={{ padding: "8px", fontWeight: 600 }}>{s.count}</td>
                <td style={{ padding: "8px" }}>{i ? pct(s.count, f.steps[i - 1].count) : "—"}</td>
                <td style={{ padding: "8px" }}>{pct(s.count, start)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="grid-2">
        <div className="card">
          <span className="mono">Screened out</span>
          {Object.keys(f.screenOuts).length ? Object.entries(f.screenOuts).map(([k, v]) => <div key={k}>{k}: {v}</div>) : <span className="lbl">None yet</span>}
        </div>
        <div className="card">
          <span className="mono">Asked directly (manual fallback)</span>
          {Object.keys(f.fallbacks).length ? Object.entries(f.fallbacks).map(([k, v]) => <div key={k}>{k}: {v}</div>) : <span className="lbl">None yet</span>}
        </div>
      </div>
      <details className="card">
        <summary style={{ cursor: "pointer", fontWeight: 600 }}>Event names and Legion&apos;s nearest current event</summary>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, marginTop: 10 }}>
          <tbody>
            {EVENT_CATALOG.map((e) => (
              <tr key={e.name} style={{ borderTop: "1px solid var(--line-soft)" }}>
                <td style={{ padding: "6px 8px", fontFamily: "var(--font-mono)" }}>{e.name}</td>
                <td style={{ padding: "6px 8px", fontFamily: "var(--font-mono)" }}>{e.legion}</td>
                <td style={{ padding: "6px 8px" }} className="lbl">{e.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
      <Link href="/start" className="back">← Back to the prototype</Link>
    </main>
  );
}
