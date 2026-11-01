"use client";
import { useCallback, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { agreements, providerById, visitInfo } from "@/lib/fixtures";
import { costShort } from "@/lib/cost";
import { slotLabel } from "@/lib/time";
import { useFlow } from "@/components/flow";
import { AgreementPanel } from "@/components/AgreementPanel";
import { Arrow, Back, ErrorText, Header, Loading, Tick } from "@/components/ui";

function fmtCard(v: string) {
  return v.replace(/\D/g, "").slice(0, 16).replace(/(\d{4})(?=\d)/g, "$1 ");
}
function fmtExp(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 4);
  return d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
}

export default function BookPage() {
  const { view, act } = useFlow("/book");
  const router = useRouter();
  const [openId, setOpenId] = useState<string | null>(null);
  const [card, setCard] = useState({ number: "", exp: "", cvc: "", zip: "" });
  const [signature, setSignature] = useState("");
  const [agree, setAgree] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const markRead = useCallback((id: string) => void act("agreement_read", { id }), [act]);

  if (!view?.session?.slot) return (<><Header path="/book" /><Loading width="w-920" /></>);
  const s = view.session;
  const slot = s.slot!;
  const p = providerById(slot.providerId)!;
  const read = new Set(s.agreementsRead);
  const nRead = agreements.filter((a) => read.has(a.id)).length;
  const allRead = nRead === agreements.length;
  const cardOk = card.number.replace(/\D/g, "").length === 16 && /^\d{2}\/\d{2}$/.test(card.exp) && card.cvc.length >= 3 && card.zip.length === 5;
  const canBook = allRead && signature.trim().length >= 3 && agree && cardOk;
  const remaining = agreements.length - nRead;
  const open = agreements.find((a) => a.id === openId);
  const identityLabel = s.identity?.mode === "pulled" ? "Checked at signup" : "Confirmed by you";

  async function book() {
    setBusy(true);
    const r = await act("book", { signature, agree, card });
    setBusy(false);
    if (!r.ok) return setError(r.error ?? "Something went wrong.");
    router.push("/booked");
  }

  const set = (k: keyof typeof card, f: (v: string) => string = (v) => v) => (e: React.ChangeEvent<HTMLInputElement>) => setCard({ ...card, [k]: f(e.target.value) });

  return (
    <>
      <Header path="/book" />
      <main className="page w-920" style={{ paddingTop: 56, gap: 24 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <span className="eb">Confirm</span>
          <h1 className="h1">Review and book</h1>
        </div>
        <div className="grid-2" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(360px, 100%), 1fr))" }}>
          <div className="card">
            <span className="mono">Your visit</span>
            <div className="row" style={{ flexWrap: "nowrap" }}>
              <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
                <div className="av">{p.initials}</div>
                <div>
                  <div style={{ fontSize: 17, fontWeight: 600 }}>{p.name}, {p.credential}</div>
                  <div className="lbl">{slotLabel(slot.at)} CT · {visitInfo.minutes}-min video</div>
                </div>
              </div>
              <Link href="/provider" className="link">Change</Link>
            </div>
            <div className="row divider">
              <span style={{ fontSize: 15 }}>Estimated cost</span>
              <span style={{ fontSize: 17, fontWeight: 600 }} data-testid="book-cost">{costShort(view.cost)}</span>
            </div>
            <div className="row">
              <span style={{ fontSize: 15 }}>Identity</span>
              <span style={{ fontSize: 15, fontWeight: 500, color: "var(--success)" }}>{identityLabel}</span>
            </div>
            <div className="divider" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <span style={{ fontSize: 15 }}>Card for {view.cost.kind === "self_pay" ? "your visit" : "copay"}</span>
              <label className="fl">
                Card number
                <input className="in sm" inputMode="numeric" autoComplete="cc-number" placeholder="4242 4242 4242 4242" value={card.number} onChange={set("number", fmtCard)} />
              </label>
              <div className="grid-2" style={{ gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 10 }}>
                <label className="fl">
                  Expiry
                  <input className="in sm" inputMode="numeric" autoComplete="cc-exp" placeholder="MM/YY" value={card.exp} onChange={set("exp", fmtExp)} />
                </label>
                <label className="fl">
                  CVC
                  <input className="in sm" inputMode="numeric" autoComplete="cc-csc" placeholder="123" value={card.cvc} onChange={set("cvc", (v) => v.replace(/\D/g, "").slice(0, 4))} />
                </label>
                <label className="fl">
                  ZIP
                  <input className="in sm" inputMode="numeric" autoComplete="postal-code" placeholder="78704" value={card.zip} onChange={set("zip", (v) => v.replace(/\D/g, "").slice(0, 5))} />
                </label>
              </div>
              <span className="lbl">Test mode: use 4242 4242 4242 4242 with any future date. Nothing is charged.</span>
            </div>
          </div>

          <div className="card">
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <span className="mono">Agreements</span>
              <span className="lbl">Open each one and scroll to the end. It&apos;s marked read only then.</span>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 6 }}>
                <div style={{ flex: 1, height: 4, borderRadius: 2, background: "var(--line)" }} aria-hidden="true">
                  <div style={{ width: `${(nRead / agreements.length) * 100}%`, height: 4, borderRadius: 2, background: "var(--success)" }} />
                </div>
                <span className="lbl" style={{ whiteSpace: "nowrap" }} data-testid="read-count">{nRead} of {agreements.length} read</span>
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              {agreements.map((a) => (
                <button key={a.id} type="button" className="doc" onClick={() => setOpenId(a.id)}>
                  <span>{a.title}</span>
                  {read.has(a.id) ? (
                    <span className="read"><Tick size={14} />Read</span>
                  ) : (
                    <span className="todo">Open to read</span>
                  )}
                </button>
              ))}
            </div>
            <label className="fl">
              Sign with your full name
              <input className="in sm" disabled={!allRead} value={signature} onChange={(e) => setSignature(e.target.value)} autoComplete="name" />
            </label>
            <label style={{ display: "flex", gap: 12, alignItems: "center", fontSize: 15, color: allRead ? "var(--ink)" : "var(--ink-3)" }}>
              <input type="checkbox" className="check" style={{ margin: 0 }} disabled={!allRead} checked={agree} onChange={(e) => setAgree(e.target.checked)} />
              I&apos;ve read and agree to these agreements
            </label>
          </div>
        </div>
        <ErrorText error={error} />
        <div className="actions">
          {!allRead && <span className="lbl">Read the last {remaining} agreement{remaining === 1 ? "" : "s"} to book.</span>}
          <button className="btn" type="button" disabled={busy || !canBook} onClick={book}>
            Book visit <Arrow />
          </button>
          <Back href="/provider" />
        </div>
      </main>
      {open && <AgreementPanel agreement={open} read={read.has(open.id)} onRead={() => markRead(open.id)} onClose={() => setOpenId(null)} />}
    </>
  );
}
