"use client";
import { useFlow } from "@/components/flow";
import { Header, Loading } from "@/components/ui";

// Shown after "Yes" on the safety check. The flow stops here: no booking.
export default function CrisisPage() {
  const { view } = useFlow("/crisis");
  if (!view) return (<><Header path="/crisis" /><Loading /></>);
  return (
    <>
      <Header path="/crisis" />
      <main className="page w-640">
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <span className="eb" style={{ color: "var(--danger)" }}>Get support now</span>
          <h1 className="h1">You don&apos;t have to go through this alone</h1>
          <p className="sub">
            Thank you for telling us. Please reach out to someone right now. These services are free, confidential and open 24 hours a day.
          </p>
        </div>
        <div className="card" style={{ borderColor: "var(--danger)", borderWidth: 2 }}>
          <span style={{ fontSize: 16, fontWeight: 600 }}>If you&apos;re in immediate danger</span>
          <a className="btn" href="tel:911" style={{ background: "var(--danger)", alignSelf: "flex-start" }}>Call 911</a>
        </div>
        <div className="card">
          <span style={{ fontSize: 16, fontWeight: 600 }}>988 Suicide and Crisis Lifeline</span>
          <span className="lbl">Talk or text with a trained counselor.</span>
          <div className="actions" style={{ gap: 12 }}>
            <a className="btn" href="tel:988">Call 988</a>
            <a className="btn2" href="sms:988">Text 988</a>
          </div>
        </div>
        <div className="card">
          <span style={{ fontSize: 16, fontWeight: 600 }}>Crisis Text Line</span>
          <span className="lbl">Text HOME to 741741.</span>
          <a className="btn2" href="sms:741741?&body=HOME" style={{ alignSelf: "flex-start" }}>Text HOME to 741741</a>
        </div>
        <p className="sub" style={{ fontSize: 15 }}>
          We&apos;ve paused your sign-up so you can get support first. Nothing has been booked or charged.
        </p>
      </main>
    </>
  );
}
