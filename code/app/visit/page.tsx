"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { patientById, providerById, scenarioById, visitInfo } from "@/lib/fixtures";
import { concernLabel } from "@/lib/concerns";
import { slotLabel } from "@/lib/time";
import { useFlow, type View } from "@/components/flow";
import { ErrorText, Header, Loading } from "@/components/ui";

/** What the provider sees when the visit starts. Shown here as a demo toggle. */
function ClinicianView({ view }: { view: View }) {
  const s = view.session!;
  const fallbackPatient = patientById(scenarioById(s.scenarioId)?.patientId ?? null);
  const name = s.identity ? `${s.identity.firstName} ${s.identity.lastName}` : fallbackPatient ? `${fallbackPatient.firstName} ${fallbackPatient.lastName}` : "Patient";
  const controlled = s.snapshot?.meds.filter((m) => m.controlled) ?? [];
  const conds = view.lookups?.records.data?.conditions ?? [];
  return (
    <section className="card" aria-label="Provider view" data-testid="clinician-view" style={{ background: "var(--tint)" }}>
      <div className="row">
        <span className="mono" style={{ color: "var(--ink)" }}>Provider view · chart summary</span>
        <span className="lbl">Demo: what {providerById(s.slot!.providerId)?.name} sees</span>
      </div>
      <div style={{ fontSize: 17, fontWeight: 600 }}>{name}</div>
      {controlled.length > 0 && (
        <div role="note" data-testid="controlled-flag" style={{ border: "1px solid #f5c26b", background: "#fff8eb", borderRadius: 12, padding: "12px 14px", display: "flex", flexDirection: "column", gap: 4 }}>
          <strong style={{ color: "#8a4b00" }}>Flag: controlled substance on file</strong>
          {controlled.map((m) => (
            <span key={m.name} style={{ fontSize: 14 }}>
              {m.name} {m.strength}
              {m.cls ? ` (${m.cls}` : " ("}
              {m.schedule ? `, Schedule ${m.schedule})` : ")"} · patient says {m.taking ? "still taking" : "not taking"}
            </span>
          ))}
          <span className="lbl">Check the Texas Prescription Monitoring Program before prescribing. The patient was not blocked or asked about this.</span>
        </div>
      )}
      <div>
        <div className="lbl">In their words</div>
        <div style={{ fontSize: 15 }}>{s.concerns?.text ? `"${s.concerns.text}"` : "—"}</div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
          {(s.concerns?.ids ?? []).map((id) => <span key={id} className="tag">{concernLabel(id)}</span>)}
        </div>
      </div>
      {conds.length > 0 && (
        <div>
          <div className="lbl">Past records (patient-confirmed)</div>
          {conds.map((c) => (
            <div key={c.code} style={{ fontSize: 15 }}>{c.display} ({c.code}, {c.recordedYear}) · {s.concerns?.recordAnswers[c.code] === "yes" ? "still relevant" : "not relevant now"}</div>
          ))}
        </div>
      )}
      <div>
        <div className="lbl">Medications</div>
        {[...(s.snapshot?.meds ?? []).map((m) => `${m.name} ${m.strength} · ${m.taking ? "taking" : "stopped"}`), ...(s.snapshot?.added ?? []).map((m) => `${m} · added by patient`)].map((t) => (
          <div key={t} style={{ fontSize: 15 }}>{t}</div>
        ))}
        {!s.snapshot?.meds.length && !s.snapshot?.added.length && <div style={{ fontSize: 15 }}>None reported</div>}
      </div>
      <div className="row">
        <span style={{ fontSize: 14 }}>Hospital stays (past year): {s.snapshot?.hospital === "had_one" ? `yes${s.snapshot.hospitalNote ? ` (${s.snapshot.hospitalNote})` : ""}` : "none"}</span>
        <span style={{ fontSize: 14 }}>Pharmacy: {s.snapshot?.pharmacy}</span>
      </div>
    </section>
  );
}

export default function VisitPage() {
  const { view, act } = useFlow("/visit");
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [showChart, setShowChart] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  if (!view?.session?.slot) return (<><Header path="/visit" /><Loading width="w-920" /></>);
  const s = view.session;
  const slot = s.slot!;
  const p = providerById(slot.providerId)!;
  const open = !!s.fastForward || now >= slot.at - 10 * 60_000;
  const joined = !!s.visitJoinedAt;
  const elapsed = joined ? Math.max(0, Math.floor((now - s.visitJoinedAt!) / 1000)) : 0;

  return (
    <>
      <Header path="/visit" />
      <main className="page w-920" style={{ gap: 24 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <span className="eb">{joined ? "In your visit" : "Your visit room"}</span>
          <h1 className="h1">{joined ? `You're with ${p.name}` : `Your visit with ${p.name}`}</h1>
          <p className="sub">{slotLabel(slot.at)} CT · {visitInfo.type}, {visitInfo.minutes} min</p>
        </div>

        {!joined ? (
          <div className="card">
            <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
              <div className="av round">{p.initials}</div>
              <div>
                <div style={{ fontSize: 17, fontWeight: 600 }}>{p.name}, {p.credential}</div>
                <div className="lbl">{open ? "Your provider is ready when you are." : "The room opens 10 minutes before your visit."}</div>
              </div>
            </div>
            <ErrorText error={error} />
            <button
              className="btn"
              type="button"
              disabled={!open}
              style={{ alignSelf: "flex-start" }}
              onClick={async () => {
                const r = await act("join_visit");
                if (!r.ok) setError(r.error ?? "Couldn't join.");
              }}
            >
              Join visit
            </button>
          </div>
        ) : (
          <>
            <div style={{ position: "relative", background: "#141417", borderRadius: 16, aspectRatio: "16 / 9", maxHeight: 460, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", overflow: "hidden" }} data-testid="video-stage">
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
                <div style={{ width: 96, height: 96, borderRadius: 48, background: "#2a2a30", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32, fontWeight: 600 }}>{p.initials}</div>
                <span style={{ fontSize: 16, fontWeight: 500 }}>{p.name}, {p.credential}</span>
                <span style={{ fontSize: 13, color: "#b4b4bb" }}>Mock video · {Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, "0")}</span>
              </div>
              <div style={{ position: "absolute", right: 14, bottom: 14, width: "22%", minWidth: 90, aspectRatio: "4 / 3", background: "#2a2a30", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, color: "#d4d4d8" }}>You</div>
            </div>
            <div className="actions">
              <button
                className="btn"
                type="button"
                style={{ background: "var(--danger)" }}
                onClick={async () => {
                  const r = await act("end_visit");
                  if (!r.ok) return setError(r.error ?? "Couldn't end the visit.");
                  router.push("/visit-complete");
                }}
              >
                End visit
              </button>
              <button type="button" className="btn2" aria-pressed={showChart} onClick={() => setShowChart((v) => !v)}>
                {showChart ? "Hide provider view" : "Show provider view (demo)"}
              </button>
            </div>
            <ErrorText error={error} />
            {showChart && <ClinicianView view={view} />}
          </>
        )}
      </main>
    </>
  );
}
