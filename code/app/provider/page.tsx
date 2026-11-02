"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { costShort } from "@/lib/cost";
import { rankProviders } from "@/lib/providers";
import { dayParts, slotInstant, slotLabel, timeLabel } from "@/lib/time";
import { useFlow } from "@/components/flow";
import { Arrow, Back, ErrorText, Header, Loading } from "@/components/ui";

export default function ProviderPage() {
  const { view, act } = useFlow("/provider");
  const router = useRouter();
  const [selected, setSelected] = useState<string | null>(null);
  const [day, setDay] = useState<number | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!view?.session) return (<><Header path="/provider" /><Loading width="w-760" /></>);
  const ranked = rankProviders(view.session);
  const current = selected ?? ranked[0].provider.id;
  const cost = view.cost;

  function choose(id: string) {
    setSelected(id);
    setDay(null);
    setTime(null);
  }

  const chosenAt = day !== null && time ? slotInstant(day, time, view.now) : null;

  async function submit() {
    if (day === null || !time) return;
    setBusy(true);
    const r = await act("choose_slot", { providerId: current, dayOffset: day, time });
    setBusy(false);
    if (!r.ok) return setError(r.error ?? "Something went wrong.");
    router.push("/book");
  }

  return (
    <>
      <Header path="/provider" />
      <main className="page w-760" style={{ paddingTop: 48, gap: 20 }}>
        <div className="row" style={{ alignItems: "flex-end" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <span className="eb">Your care team</span>
            <h1 className="h1">Pick a provider and time</h1>
            <p className="sub" style={{ fontSize: 16 }}>Ranked from your answers, specialty fit and real availability.</p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, background: "var(--tint)", borderRadius: 12, padding: "10px 14px" }} data-testid="cost-pill">
            <span style={{ fontSize: 14 }}>
              {cost.kind === "copay" ? (<><strong>${cost.amount}</strong> per visit with your plan</>) : cost.kind === "self_pay" ? (<><strong>${cost.amount}</strong> first visit, self-pay</>) : costShort(cost)}
            </span>
          </div>
        </div>

        {ranked.map(({ provider: p, label, first }) => {
          const open = p.id === current;
          const next = slotLabel(slotInstant(first.dayOffset, first.time, view.now));
          if (!open)
            return (
              <div key={p.id} className="card" style={{ flexDirection: "row", alignItems: "center", flexWrap: "wrap" }}>
                <div className="av">{p.initials}</div>
                <div style={{ flex: "1 1 200px", display: "flex", flexDirection: "column", gap: 4 }}>
                  {label && <span className="mono" style={{ color: "var(--accent)" }}>{label}</span>}
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 17, fontWeight: 600 }}>{p.name}</span>
                    <span className="lbl">{p.credential}</span>
                    {p.tags.map((t) => <span key={t} className="tag">{t}</span>)}
                  </div>
                  <span className="lbl">Next opening: {next} CT</span>
                </div>
                <button type="button" className="link" style={{ whiteSpace: "nowrap" }} onClick={() => choose(p.id)} aria-label={`View times for ${p.name}`}>
                  View times →
                </button>
              </div>
            );
          const days = [...p.slots].sort((a, b) => a.dayOffset - b.dayOffset);
          const activeDay = day ?? days[0].dayOffset;
          const times = days.find((d) => d.dayOffset === activeDay)?.times ?? [];
          return (
            <section key={p.id} className="card sel" aria-label={`${p.name}, selected`} data-testid="provider-open">
              <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
                <div className="av">{p.initials}</div>
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4 }}>
                  {label && <span className="mono" style={{ color: "var(--accent)" }}>{label}</span>}
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 18, fontWeight: 600 }}>{p.name}</span>
                    <span className="lbl">{p.credential}</span>
                    {p.tags.map((t) => <span key={t} className="tag">{t}</span>)}
                  </div>
                </div>
                <span className="radio on" aria-hidden="true" />
              </div>
              <div className="divider" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <span className="mono" id={`days-${p.id}`}>Choose a day</span>
                <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4 }} role="group" aria-labelledby={`days-${p.id}`}>
                  {days.map((d) => {
                    const dp = dayParts(d.dayOffset, view.now);
                    const on = d.dayOffset === activeDay;
                    return (
                      <button key={d.dayOffset} type="button" className={`day${on ? " on" : ""}`} aria-pressed={on} onClick={() => { setDay(d.dayOffset); setTime(null); }}>
                        <span className="mono" style={on ? { color: "var(--accent)" } : undefined}>{dp.weekday}</span>
                        <span style={{ fontSize: 16, fontWeight: 600 }}>{dp.monthDay}</span>
                        <span className="lbl">{d.times.length} open</span>
                      </button>
                    );
                  })}
                </div>
                <span className="mono" style={{ marginTop: 6 }} id={`times-${p.id}`}>Available times · Central</span>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }} role="group" aria-labelledby={`times-${p.id}`}>
                  {times.map((t) => {
                    const on = time === t && (day ?? activeDay) === activeDay;
                    return (
                      <button key={t} type="button" className={`time${on ? " on" : ""}`} aria-pressed={on} onClick={() => { setDay(activeDay); setTime(t); }}>
                        {timeLabel(t)}
                      </button>
                    );
                  })}
                </div>
              </div>
            </section>
          );
        })}

        <ErrorText error={error} />
        <div className="actions">
          <button className="btn" type="button" disabled={busy || !chosenAt} onClick={submit}>
            {chosenAt ? <>Continue with {slotLabel(chosenAt)} <Arrow /></> : "Choose a time"}
          </button>
          <Back href="/snapshot" />
        </div>
      </main>
    </>
  );
}
