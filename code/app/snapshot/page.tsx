"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { monthYearDaysAgo } from "@/lib/time";
import { useFlow } from "@/components/flow";
import { Arrow, Back, ErrorText, Header, Loading, Seg, Tick } from "@/components/ui";

export default function SnapshotPage() {
  const { view, act } = useFlow("/snapshot");
  const router = useRouter();
  const [taking, setTaking] = useState<Record<string, boolean>>({});
  const [added, setAdded] = useState<string[]>([]);
  const [newMed, setNewMed] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [anyMeds, setAnyMeds] = useState<"yes" | "no" | undefined>();
  const [hospital, setHospital] = useState<"none" | "had_one" | undefined>();
  const [hospitalNote, setHospitalNote] = useState("");
  const [pharmacy, setPharmacy] = useState("");
  const [editPharmacy, setEditPharmacy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const restored = useRef(false);
  const saved = view?.session?.snapshot;

  useEffect(() => {
    if (saved && !restored.current) {
      restored.current = true;
      setTaking(Object.fromEntries(saved.meds.map((m) => [m.name, m.taking])));
      setAdded(saved.added);
      setAnyMeds(saved.added.length ? "yes" : saved.meds.length ? undefined : "no");
      setHospital(saved.hospital);
      setHospitalNote(saved.hospitalNote ?? "");
      setPharmacy(saved.pharmacy);
      setEditPharmacy(true);
    }
  }, [saved]);

  if (!view?.lookups) return (<><Header path="/snapshot" /><Loading width="w-760" /></>);
  const meds = view.lookups.medications;
  const records = view.lookups.records;
  const fills = meds.status === "ready" ? meds.data?.fills ?? [] : [];
  const pulledPharmacy = meds.status === "ready" ? meds.data?.pharmacy : undefined;
  const recordsReady = records.status === "ready";
  const pharmacyText = editPharmacy || !pulledPharmacy ? pharmacy : `${pulledPharmacy.name}, ${pulledPharmacy.address}`;
  const showAdd = fills.length > 0 ? addOpen : anyMeds === "yes";

  function addMed() {
    const v = newMed.trim();
    if (!v) return;
    setAdded((a) => [...a, v]);
    setNewMed("");
  }

  const ready =
    fills.every((f) => typeof taking[f.name] === "boolean") &&
    (fills.length > 0 || anyMeds === "no" || (anyMeds === "yes" && added.length > 0)) &&
    !!hospital &&
    pharmacyText.trim().length > 0;

  async function submit() {
    setBusy(true);
    const r = await act("submit_snapshot", {
      taking,
      added,
      anyMeds: anyMeds === "yes",
      hospital,
      hospitalNote,
      pharmacy: pharmacyText,
    });
    setBusy(false);
    if (!r.ok) return setError(r.error ?? "Something went wrong.");
    router.push("/provider");
  }

  return (
    <>
      <Header path="/snapshot" />
      <main className="page w-760" style={{ gap: 24 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <span className="eb">Health snapshot</span>
          <h1 className="h1">{fills.length || recordsReady ? "Here's what we found. Anything changed?" : "A few quick health questions"}</h1>
        </div>

        <div className="card" style={{ gap: 16 }} data-testid="meds-card">
          {fills.length > 0 ? (
            <>
              <span className="lbl">Medications · still taking?</span>
              {fills.map((f) => (
                <div className="row" key={f.name}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <div className="val">
                      {f.name} {f.strength}
                    </div>
                    <div className="lbl">Last filled {monthYearDaysAgo(f.lastFilledDaysAgo, view.now)}</div>
                    {f.controlled && (
                      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                        <span className="tag">Controlled medication{f.schedule ? ` · Schedule ${f.schedule}` : ""}</span>
                        <span className="lbl">Your provider will go over this with you at your visit.</span>
                      </div>
                    )}
                  </div>
                  <Seg
                    label={`Still taking ${f.name}?`}
                    value={taking[f.name] === undefined ? undefined : taking[f.name] ? "yes" : "no"}
                    options={[{ value: "yes", label: "Yes" }, { value: "no", label: "No" }]}
                    onChange={(v) => setTaking({ ...taking, [f.name]: v === "yes" })}
                  />
                </div>
              ))}
              <div className="row divider">
                {fills.some((f) => f.controlled) ? (
                  <span className="lbl">We share your medication history with your provider before the visit.</span>
                ) : (
                  <div className="ok">
                    <Tick />
                    No stimulants, benzodiazepines or opioids filled in the past year
                  </div>
                )}
                {!addOpen && (
                  <button type="button" className="link" onClick={() => setAddOpen(true)}>
                    + Add a medication
                  </button>
                )}
              </div>
            </>
          ) : (
            <div className="row">
              <span className="val">Are you taking any medications?</span>
              <Seg label="Are you taking any medications?" value={anyMeds} options={[{ value: "no", label: "No" }, { value: "yes", label: "Yes" }]} onChange={setAnyMeds} />
            </div>
          )}
          {added.length > 0 && (
            <ul style={{ margin: 0, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 4 }}>
              {added.map((m, i) => (
                <li key={i} style={{ fontSize: 15 }}>
                  {m}{" "}
                  <button type="button" className="link" style={{ fontSize: 13, marginLeft: 6 }} onClick={() => setAdded(added.filter((_, j) => j !== i))}>
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
          {showAdd && (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <label className="sr-only" htmlFor="new-med">Medication name and dose</label>
              <input
                id="new-med"
                className="in sm"
                style={{ flex: "1 1 220px", width: "auto" }}
                placeholder="Name and dose, e.g. Sertraline 50 mg"
                value={newMed}
                onChange={(e) => setNewMed(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addMed();
                  }
                }}
              />
              <button type="button" className="btn2" onClick={addMed}>Add</button>
            </div>
          )}
        </div>

        <div className="card" data-testid="hospital-card">
          {recordsReady ? (
            <>
              <span className="lbl">Hospital stays · past year</span>
              <div className="row">
                <div className="val">{records.data?.hospitalStaysPastYear.length ? `${records.data.hospitalStaysPastYear.length} found` : "None found"}</div>
                <Seg label="Hospital stays in the past year" value={hospital} options={[{ value: "none", label: "Correct" }, { value: "had_one", label: "I had one" }]} onChange={setHospital} />
              </div>
            </>
          ) : (
            <div className="row">
              <span className="val">Any hospital stays in the past year?</span>
              <Seg label="Any hospital stays in the past year?" value={hospital} options={[{ value: "none", label: "No" }, { value: "had_one", label: "Yes" }]} onChange={setHospital} />
            </div>
          )}
          {hospital === "had_one" && (
            <label className="fl">
              Tell us briefly (optional): when, and what for
              <input className="in sm" value={hospitalNote} maxLength={300} onChange={(e) => setHospitalNote(e.target.value)} />
            </label>
          )}
        </div>

        <div className="card">
          <span className="lbl">Pharmacy</span>
          {pulledPharmacy && !editPharmacy ? (
            <div className="row">
              <div className="val">
                {pulledPharmacy.name}, {pulledPharmacy.address}
              </div>
              <button
                type="button"
                className="link"
                onClick={() => {
                  setPharmacy(`${pulledPharmacy.name}, ${pulledPharmacy.address}`);
                  setEditPharmacy(true);
                }}
              >
                Change
              </button>
            </div>
          ) : (
            <label className="fl">
              <span className="sr-only">Pharmacy name and street</span>
              <input className="in sm" placeholder="Pharmacy name and street" value={pharmacy} onChange={(e) => setPharmacy(e.target.value)} />
            </label>
          )}
        </div>

        <ErrorText error={error} />
        <div className="actions">
          <button className="btn" type="button" disabled={busy || !ready} onClick={submit}>
            Looks right <Arrow />
          </button>
          <Back href="/concerns" />
        </div>
      </main>
    </>
  );
}
