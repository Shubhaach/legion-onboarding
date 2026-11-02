"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useFlow } from "@/components/flow";
import { Back, ErrorText, Header, Loading } from "@/components/ui";

export default function SafetyPage() {
  const { view, act } = useFlow("/safety");
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  if (!view) return (<><Header path="/safety" /><Loading /></>);

  async function answer(a: "yes" | "no") {
    setBusy(true);
    const r = await act("safety", { answer: a });
    setBusy(false);
    if (!r.ok) return setError(r.error ?? "Something went wrong.");
    router.push(a === "yes" ? "/crisis" : "/concerns");
  }

  return (
    <>
      <Header path="/safety" />
      <main className="page w-640" style={{ paddingTop: "clamp(40px, 10vw, 120px)" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <span className="eb">Safety check</span>
          <h1 className="h1" id="safety-q">Are you currently thinking about harming yourself or someone else?</h1>
          <p className="sub">
            We ask everyone before booking. If you&apos;re in immediate danger, call <a href="tel:911">911</a>. You can also call or text <a href="tel:988">988</a>.
          </p>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }} role="group" aria-labelledby="safety-q">
          <button className={`opt${view.session?.safety === "yes" ? " on" : ""}`} type="button" disabled={busy} onClick={() => answer("yes")}>Yes</button>
          <button className={`opt${view.session?.safety === "no" ? " on" : ""}`} type="button" disabled={busy} onClick={() => answer("no")}>No</button>
        </div>
        <ErrorText error={error} />
        <div className="row">
          <Back href="/confirm" />
          <span className="lbl">A &quot;Yes&quot; connects you to crisis support right away.</span>
        </div>
      </main>
    </>
  );
}
