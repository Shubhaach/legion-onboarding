"use client";
// Demo panel (bottom-right). The only place vendor names appear: shows the scenario,
// each lookup's status and source, mock text messages and the live event log.
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { patients, scenarios } from "@/lib/fixtures";
import { useFlowCtx } from "./flow";

const LOOKUPS: { key: "identity" | "coverage" | "records" | "medications"; label: string }[] = [
  { key: "identity", label: "Identity" },
  { key: "coverage", label: "Coverage + copay" },
  { key: "records", label: "Records (HIE)" },
  { key: "medications", label: "Medications + pharmacy" },
];

const STATUS_COLOR: Record<string, string> = {
  ready: "var(--success)",
  pending: "#8a4b00",
  not_found: "var(--ink-2)",
  error: "var(--danger)",
};

function fmtPhone(p: string) {
  return `(${p.slice(0, 3)}) ${p.slice(3, 6)}-${p.slice(6)}`;
}

function fmtDob(iso: string) {
  const [y, m, d] = iso.split("-");
  return `${m}/${d}/${y}`;
}

function rel(ms: number) {
  const s = Math.max(0, Math.round(ms / 1000));
  return `+${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export function DemoPanel() {
  const [open, setOpen] = useState(false);
  const { view, act, setDemoOpen } = useFlowCtx();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => setDemoOpen(open), [open, setDemoOpen]);
  if (pathname.startsWith("/debug")) return null;

  const s = view?.session;
  const lookups = view?.lookups;

  return (
    <div style={{ position: "fixed", right: 16, bottom: 16, zIndex: 50, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8, maxWidth: "calc(100vw - 32px)" }}>
      {open && (
        <section
          aria-label="Demo panel"
          style={{
            width: 380,
            maxWidth: "100%",
            maxHeight: "min(70vh, 640px)",
            overflowY: "auto",
            background: "#fff",
            border: "1px solid var(--line-2)",
            borderRadius: 14,
            boxShadow: "0 12px 40px rgba(11,11,12,.16)",
            padding: 16,
            display: "flex",
            flexDirection: "column",
            gap: 14,
            fontSize: 13,
          }}
        >
          <div className="row">
            <span className="mono" style={{ color: "var(--ink)" }}>Demo panel</span>
            <span className="lbl">Not shown to patients</span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span className="mono">Scenario</span>
            {s && view?.scenario ? (
              <div>
                <strong>{view.scenario.label}</strong>
                <div className="lbl">
                  {fmtPhone(s.phone)} · DOB {fmtDob(s.dob)}
                  {!s.consent && " · no consent to pull"}
                </div>
              </div>
            ) : (
              <span className="lbl">No session yet. Pick a scenario to fill screen 1:</span>
            )}
            {pathname === "/start" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {scenarios.map((sc) => {
                  const p = patients.find((x) => x.id === sc.patientId);
                  const dob = p?.dob ?? "1990-06-15";
                  return (
                    <button
                      key={sc.id}
                      type="button"
                      className="link"
                      style={{ textAlign: "left", fontSize: 13 }}
                      onClick={() => window.dispatchEvent(new CustomEvent("demo:fill", { detail: { phone: sc.phone, dob } }))}
                    >
                      {fmtPhone(sc.phone)} · {sc.label}
                    </button>
                  );
                })}
                <span className="lbl">Any 6-digit code works; 000000 simulates a wrong code.</span>
              </div>
            )}
          </div>

          {lookups && (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span className="mono">Pulled, not typed</span>
              {LOOKUPS.map(({ key, label }) => {
                const l = lookups[key];
                return (
                  <div key={key} className="row" style={{ flexWrap: "nowrap", alignItems: "flex-start" }} data-testid={`demo-${key}`}>
                    <div>
                      <div>{label}</div>
                      <div className="lbl">
                        <span className="src">{l.source}</span>
                        {l.note ? ` ${l.note}` : ""}
                      </div>
                    </div>
                    <span style={{ color: STATUS_COLOR[l.status], fontWeight: 600, whiteSpace: "nowrap" }}>
                      {l.status}
                      {l.readyAt && s ? ` ${rel(l.readyAt - s.startedAt)}` : ""}
                    </span>
                  </div>
                );
              })}
              <div className="row" style={{ flexWrap: "nowrap", alignItems: "flex-start" }}>
                <div>
                  <div>Concerns (screen 4)</div>
                  <div className="lbl">
                    <span className="src">{s?.concerns?.source === "ai" ? "Claude" : s?.concerns ? "Keyword fallback" : "Claude / keywords"}</span>
                  </div>
                </div>
                <span style={{ fontWeight: 600 }}>{s?.concerns ? "done" : "—"}</span>
              </div>
            </div>
          )}

          {!!view?.texts?.length && (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span className="mono">Text messages (mock, none sent)</span>
              {view.texts.map((t) => (
                <div key={t.id} style={{ background: "var(--tint)", borderRadius: 10, padding: "8px 10px" }}>
                  <div className="lbl" style={{ marginBottom: 2 }}>
                    {t.at
                      ? `${t.at <= view.now ? "Sent" : "Scheduled"} ${new Date(t.at).toLocaleString("en-US", { timeZone: "America/Chicago", weekday: "short", hour: "numeric", minute: "2-digit" })} CT`
                      : "On visit completed"}
                  </div>
                  {t.text}
                </div>
              ))}
            </div>
          )}

          {s?.bookedAt && !s.visitJoinedAt && (
            <button
              type="button"
              className="btn2"
              onClick={async () => {
                await act("fast_forward");
                router.push("/visit");
              }}
            >
              Fast-forward to visit time
            </button>
          )}

          {!!view?.events?.length && (
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <span className="mono">Event log</span>
              <ol style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 3 }} data-testid="demo-events">
                {[...view.events].reverse().map(([name, t, detail], i) => (
                  <li key={i} style={{ fontFamily: "var(--font-mono)", fontSize: 11.5, lineHeight: 1.4 }}>
                    <span style={{ color: "var(--ink-2)" }}>{rel(t)}</span> {name}
                    {detail ? <span style={{ color: "var(--ink-2)" }}> · {detail}</span> : null}
                  </li>
                ))}
              </ol>
            </div>
          )}

          <div className="row">
            <Link href="/debug/funnel" className="link" style={{ fontSize: 13 }}>
              Funnel (/debug/funnel)
            </Link>
            {s && (
              <button
                type="button"
                className="link"
                style={{ fontSize: 13 }}
                onClick={async () => {
                  await act("sign_out");
                  router.push("/start");
                }}
              >
                Reset demo
              </button>
            )}
          </div>
        </section>
      )}
      <button
        type="button"
        className="btn2"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        style={{ boxShadow: "0 4px 16px rgba(11,11,12,.12)", fontFamily: "var(--font-mono)", fontSize: 12, letterSpacing: ".12em", textTransform: "uppercase" }}
      >
        {open ? "Close demo" : "Demo"}
      </button>
    </div>
  );
}
