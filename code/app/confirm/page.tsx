"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { selfPayFirstVisit, stateName } from "@/lib/fixtures";
import { useFlow } from "@/components/flow";
import { Arrow, ErrorText, Header, Loading, Tick } from "@/components/ui";
import { InsuranceChoice, type InsuranceValue } from "@/components/Insurance";
import { ManualForm } from "@/components/ManualForm";

type Mode = "review" | "edit" | "self" | "address";

function fmtDob(iso: string) {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
}

function maskId(id: string) {
  return `${id.slice(0, 3)} ••• ${id.slice(-4)}`;
}

export default function ConfirmPage() {
  const { view, act } = useFlow("/confirm");
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("review");
  const [ins, setIns] = useState<InsuranceValue>({ insuranceMode: "", payer: "", memberId: "" });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!view?.lookups || !view.session) return (<><Header path="/confirm" /><Loading width="w-760" /></>);
  const s = view.session;
  const { identity, coverage } = view.lookups;

  async function submitManual(data: Record<string, unknown>) {
    const r = await act("manual_identity", data);
    if (!r.ok) return r.error ?? "Something went wrong.";
    setMode("review");
    if (r.view?.session?.screenOut !== "state") router.push("/safety");
    return null;
  }

  const title = (eb: string, h: string, sub: string) => (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <span className="eb">{eb}</span>
      <h1 className="h1">{h}</h1>
      <p className="sub">{sub}</p>
    </div>
  );

  let body: React.ReactNode;

  if (s.screenOut === "state" && mode !== "address") {
    const st = s.identity?.address.state ?? identity.data?.address.state ?? "";
    body = (
      <>
        {title("We're sorry", `Legion can't see patients in ${stateName(st)} yet`, "Our providers are licensed in Texas and Utah, so we can't book a visit for an address outside those states. Nothing has been booked or charged.")}
        <div className="card tint">
          <span style={{ fontSize: 16, fontWeight: 600 }}>Finding care near you</span>
          <span style={{ fontSize: 15, lineHeight: 1.55 }}>
            <a href="https://findtreatment.gov" target="_blank" rel="noreferrer">findtreatment.gov</a> lists mental health services by location. If you&apos;re in crisis, call or text <a href="tel:988">988</a>, any time.
          </span>
        </div>
        <div className="actions">
          <button type="button" className="ghost" onClick={() => setMode("address")}>My address is wrong</button>
        </div>
      </>
    );
  } else if (identity.status === "pending") {
    body = (
      <>
        {title("Confirm your details", "Is this you?", "Looking you up from your number…")}
        <div className="grid-2" aria-busy="true">
          <div className="card"><div className="skeleton" style={{ width: "60%" }} /><div className="skeleton" style={{ width: "40%" }} /><div className="skeleton" style={{ width: "80%" }} /></div>
          <div className="card"><div className="skeleton" style={{ width: "70%" }} /><div className="skeleton" style={{ width: "50%" }} /></div>
        </div>
      </>
    );
  } else if (identity.status !== "ready" || mode === "self") {
    const self = mode === "self" || !s.consent;
    body = (
      <>
        {title("Your details", self ? "Tell us about you" : "We couldn't find your details", self ? "Your name, home address and how you'll pay." : "No problem. Fill these in and we'll take it from here.")}
        <ManualForm
          reason={self ? "self" : "no_match"}
          insuranceModes={["manual", "card_photo", "self_pay"]}
          onSubmit={submitManual}
          onCancel={mode === "self" ? () => setMode("review") : undefined}
        />
      </>
    );
  } else if (mode === "edit" || mode === "address") {
    const p = identity.data!;
    const pulledPlan = coverage.status === "ready";
    body = (
      <>
        {title("Your details", "Fix what's wrong", "Change anything that isn't right.")}
        <ManualForm
          reason={mode}
          initial={{
            firstName: s.identity?.firstName ?? p.firstName,
            lastName: s.identity?.lastName ?? p.lastName,
            address: s.identity?.address ?? p.address,
            insurance: { insuranceMode: pulledPlan ? "pulled" : "", payer: "", memberId: "" },
          }}
          insuranceModes={pulledPlan ? ["pulled", "manual", "card_photo", "self_pay"] : ["manual", "card_photo", "self_pay"]}
          onSubmit={submitManual}
          onCancel={() => setMode("review")}
        />
      </>
    );
  } else {
    const p = identity.data!;
    const noCoverage = coverage.status === "not_found" || coverage.status === "error";
    const canConfirm = !noCoverage || !!ins.insuranceMode;
    body = (
      <>
        {title("Confirm your details", "Is this you?", "We found this from your number. Tell us if anything is off.")}
        <div className="grid-2">
          <div className="card">
            <div><div className="lbl">Name</div><div className="val">{p.firstName} {p.lastName}</div></div>
            <div><div className="lbl">Date of birth</div><div className="val">{fmtDob(p.dob)}</div></div>
            <div><div className="lbl">Home address</div><div className="val">{p.address.line1}, {p.address.city}, {p.address.state} {p.address.zip}</div></div>
            <div className="ok"><Tick />In {stateName(p.address.state)}. Legion can see you.</div>
          </div>
          <div className="card" data-testid="coverage-card">
            {coverage.status === "pending" ? (
              <>
                <div className="lbl">Insurance</div>
                <div className="skeleton" style={{ width: "70%" }} />
                <span className="lbl">Checking your plan and copay…</span>
              </>
            ) : coverage.status === "ready" && coverage.data ? (
              <>
                <div><div className="lbl">Insurance</div><div className="val">{coverage.data.payer} {coverage.data.plan}</div></div>
                <div><div className="lbl">Member ID</div><div className="val">{maskId(coverage.data.memberId)}</div></div>
                <div className="ok"><Tick />{coverage.data.inNetwork ? "In network for psychiatry" : "Out of network"}</div>
                {coverage.data.behavioralHealthCarveOut && coverage.data.carveOutAdministrator && (
                  <span className="lbl">Mental health benefits are managed by {coverage.data.carveOutAdministrator}. We checked with them.</span>
                )}
                <div className="row divider" style={{ marginTop: "auto" }}>
                  <span style={{ fontSize: 15 }}>Estimated visit cost</span>
                  <span style={{ fontSize: 20, fontWeight: 600 }}>${coverage.data.copay} copay</span>
                </div>
              </>
            ) : (
              <>
                <div><div className="lbl">Insurance</div><div className="val">We couldn&apos;t find an active plan</div></div>
                <div className="row divider">
                  <span style={{ fontSize: 15 }}>Self-pay first visit</span>
                  <span style={{ fontSize: 20, fontWeight: 600 }}>${selfPayFirstVisit}</span>
                </div>
                <InsuranceChoice value={ins} onChange={setIns} modes={["card_photo", "self_pay"]} />
              </>
            )}
          </div>
        </div>
        <ErrorText error={error} />
        <div className="actions">
          <button
            className="btn"
            type="button"
            disabled={busy || !canConfirm}
            onClick={async () => {
              setBusy(true);
              const r = await act("confirm_identity", noCoverage ? { ...ins } : {});
              setBusy(false);
              if (!r.ok) return setError(r.error ?? "Something went wrong.");
              router.push("/safety");
            }}
          >
            Yes, that&apos;s me <Arrow />
          </button>
          <button className="ghost" type="button" onClick={() => setMode("edit")}>Something&apos;s wrong</button>
          <button className="link" type="button" style={{ color: "var(--ink-2)", fontWeight: 400 }} onClick={() => setMode("self")}>
            I&apos;d rather fill this in myself
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      <Header path="/confirm" />
      <main className="page w-760">{body}</main>
    </>
  );
}
