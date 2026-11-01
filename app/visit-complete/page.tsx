"use client";
import { useState } from "react";
import { providerById } from "@/lib/fixtures";
import { slotLabel } from "@/lib/time";
import { useFlow } from "@/components/flow";
import { ErrorText, Header, Loading, Tick } from "@/components/ui";

// The finish line: onboarding ends when the first visit is completed.
export default function VisitCompletePage() {
  const { view, act } = useFlow("/visit-complete");
  const [error, setError] = useState<string | null>(null);
  if (!view?.session?.slot) return (<><Header path="/visit-complete" /><Loading width="w-760" /></>);
  const s = view.session;
  const p = providerById(s.slot!.providerId)!;
  const options = [28, 35].map((d) => s.slot!.at + d * 86400_000);

  return (
    <>
      <Header path="/visit-complete" />
      <main className="page w-760" style={{ gap: 24 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <span className="eb ok" style={{ display: "flex", alignItems: "center", gap: 8 }}><Tick />First visit completed</span>
          <h1 className="h1">You&apos;re all set up with {p.name}</h1>
          <p className="sub">Thanks for joining your first visit. Here&apos;s what happens next.</p>
        </div>
        <div className="card">
          <span style={{ fontSize: 16, fontWeight: 600 }}>Next steps</span>
          <div className="step"><span className="dot">1</span><div><div style={{ fontSize: 15, fontWeight: 500 }}>Your care plan</div><div className="lbl">{p.name} will post your plan and visit notes in your Legion account within 24 hours.</div></div></div>
          <div className="step"><span className="dot">2</span><div><div style={{ fontSize: 15, fontWeight: 500 }}>Any prescription</div><div className="lbl">Goes straight to your pharmacy. We&apos;ll text you when it&apos;s ready.</div></div></div>
          <div className="step"><span className="dot">3</span><div><div style={{ fontSize: 15, fontWeight: 500 }}>Questions</div><div className="lbl">Message your care team any time from your account.</div></div></div>
        </div>
        <div className="card" data-testid="followup-card">
          <span style={{ fontSize: 16, fontWeight: 600 }}>Book your follow-up</span>
          {s.followUpAt ? (
            <span className="ok"><Tick />Follow-up booked: {slotLabel(s.followUpAt)} CT with {p.name}</span>
          ) : (
            <>
              <span className="lbl">{p.name} suggests a follow-up in about four weeks. Same time, same provider:</span>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {options.map((at) => (
                  <button
                    key={at}
                    type="button"
                    className="time"
                    onClick={async () => {
                      const r = await act("book_followup", { at });
                      if (!r.ok) setError(r.error ?? "Couldn't book.");
                    }}
                  >
                    {slotLabel(at)}
                  </button>
                ))}
              </div>
            </>
          )}
          <ErrorText error={error} />
        </div>
        <div className="card">
          <span className="lbl">Pharmacy on file</span>
          <div className="val">{s.snapshot?.pharmacy}</div>
        </div>
      </main>
    </>
  );
}
