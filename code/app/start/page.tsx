"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Arrow, ErrorText, Header } from "@/components/ui";
import { useFlowCtx } from "@/components/flow";

function formatPhone(raw: string) {
  const d = raw.replace(/\D/g, "").slice(0, 10);
  if (d.length < 4) return d;
  if (d.length < 7) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
}

function formatDob(raw: string) {
  const d = raw.replace(/\D/g, "").slice(0, 8);
  if (d.length < 3) return d;
  if (d.length < 5) return `${d.slice(0, 2)} / ${d.slice(2)}`;
  return `${d.slice(0, 2)} / ${d.slice(2, 4)} / ${d.slice(4)}`;
}

/** "03 / 14 / 1992" -> "1992-03-14", or "" if not a real date. */
function dobToIso(v: string) {
  const d = v.replace(/\D/g, "");
  if (d.length !== 8) return "";
  const iso = `${d.slice(4)}-${d.slice(0, 2)}-${d.slice(2, 4)}`;
  const t = Date.parse(iso);
  return Number.isNaN(t) || t > Date.now() ? "" : iso;
}

export default function StartPage() {
  const { act } = useFlowCtx();
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [dob, setDob] = useState("");
  const [consent, setConsent] = useState(true);
  const [stage, setStage] = useState<"details" | "code">("details");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const codeRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fill = (e: Event) => {
      const { phone: p, dob: d } = (e as CustomEvent<{ phone: string; dob: string }>).detail;
      const [y, m, day] = d.split("-");
      setPhone(formatPhone(p));
      setDob(formatDob(`${m}${day}${y}`));
      setStage("details");
      setError(null);
    };
    window.addEventListener("demo:fill", fill);
    return () => window.removeEventListener("demo:fill", fill);
  }, []);

  useEffect(() => {
    if (stage === "code") codeRef.current?.focus();
  }, [stage]);

  async function sendCode(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (phone.replace(/\D/g, "").length !== 10) return setError("Enter a 10-digit mobile number.");
    const iso = dobToIso(dob);
    if (!iso) return setError("Enter your date of birth as MM / DD / YYYY.");
    setBusy(true);
    // Starts every lookup on the server clock; screen 2 reads whatever has arrived.
    const r = await act("start", { phone, dob: iso, consent });
    setBusy(false);
    if (!r.ok) return setError(r.error ?? "Something went wrong.");
    setStage("code");
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const r = await act("verify_code", { code });
    setBusy(false);
    if (!r.ok) return setError(r.error ?? "That code didn't work.");
    router.push("/confirm");
  }

  return (
    <>
      <Header path="/start" />
      <main className="page w-640" style={{ paddingTop: "clamp(40px, 8vw, 88px)" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <span className="eb">Get started</span>
          <h1 className="h1">Let&apos;s get you seen by a provider</h1>
          <p className="sub">Two details. We fill in the rest.</p>
        </div>

        {stage === "details" ? (
          <form onSubmit={sendCode} style={{ display: "flex", flexDirection: "column", gap: 28 }} noValidate>
            <div className="grid-2" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(220px, 100%), 1fr))" }}>
              <label className="fl">
                Mobile number
                <input className="in" inputMode="tel" autoComplete="tel-national" placeholder="(512) 555-0142" value={phone} onChange={(e) => setPhone(formatPhone(e.target.value))} />
              </label>
              <label className="fl">
                Date of birth
                <input className="in" inputMode="numeric" autoComplete="bday" placeholder="MM / DD / YYYY" value={dob} onChange={(e) => setDob(formatDob(e.target.value))} />
              </label>
            </div>
            <div className="card tint">
              <label style={{ display: "flex", gap: 12, alignItems: "flex-start", fontSize: 15, lineHeight: 1.5, cursor: "pointer" }}>
                <input type="checkbox" className="check" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
                <span>Let Legion pull my insurance, records and medication history to fill this in for me.</span>
              </label>
              <span className="lbl" style={{ paddingLeft: 32 }}>
                We use it only to set up your care. Untick to fill everything in yourself.
              </span>
            </div>
            <ErrorText error={error} />
            <div className="actions">
              <button className="btn" type="submit" disabled={busy}>
                Text me a code <Arrow />
              </button>
              <span className="lbl">
                Already have an account? <a href="#" onClick={(e) => e.preventDefault()}>Sign in</a>
              </span>
            </div>
          </form>
        ) : (
          <form onSubmit={verify} style={{ display: "flex", flexDirection: "column", gap: 24 }} noValidate>
            <label className="fl" style={{ maxWidth: 320 }}>
              We texted a 6-digit code to {phone}
              <input
                ref={codeRef}
                className="in"
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="••••••"
                value={code}
                maxLength={6}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                style={{ letterSpacing: ".3em" }}
              />
            </label>
            <ErrorText error={error} />
            <div className="actions">
              <button className="btn" type="submit" disabled={busy || code.length !== 6}>
                Continue <Arrow />
              </button>
              <button type="button" className="ghost" onClick={() => { setStage("details"); setCode(""); setError(null); }}>
                Change number
              </button>
            </div>
          </form>
        )}
      </main>
    </>
  );
}
