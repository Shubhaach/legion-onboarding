"use client";
import { useState } from "react";
import { US_STATES, type Address } from "@/lib/fixtures";
import { Arrow, ErrorText } from "./ui";
import { InsuranceChoice, type InsuranceMode, type InsuranceValue } from "./Insurance";

export interface ManualInitial {
  firstName: string;
  lastName: string;
  address: Address;
  insurance?: InsuranceValue;
}

/** One form for every case where the patient types their own details. */
export function ManualForm({
  initial,
  reason,
  insuranceModes,
  onSubmit,
  onCancel,
}: {
  initial?: ManualInitial;
  reason: "no_match" | "edit" | "self" | "address";
  insuranceModes: InsuranceMode[];
  onSubmit: (data: Record<string, unknown>) => Promise<string | null>;
  onCancel?: () => void;
}) {
  const [f, setF] = useState({
    firstName: initial?.firstName ?? "",
    lastName: initial?.lastName ?? "",
    line1: initial?.address.line1 ?? "",
    city: initial?.address.city ?? "",
    state: initial?.address.state ?? "TX",
    zip: initial?.address.zip ?? "",
  });
  const [ins, setIns] = useState<InsuranceValue>(initial?.insurance ?? { insuranceMode: "", payer: "", memberId: "" });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const err = await onSubmit({ reason, ...f, ...ins });
    setBusy(false);
    setError(err);
  }

  return (
    <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 24 }} noValidate>
      <div className="card">
        <div className="grid-2" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(220px, 100%), 1fr))" }}>
          <label className="fl">
            First name
            <input className="in sm" autoComplete="given-name" value={f.firstName} onChange={set("firstName")} />
          </label>
          <label className="fl">
            Last name
            <input className="in sm" autoComplete="family-name" value={f.lastName} onChange={set("lastName")} />
          </label>
        </div>
        <label className="fl">
          Home address
          <input className="in sm" autoComplete="address-line1" value={f.line1} onChange={set("line1")} />
        </label>
        <div className="grid-2" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(140px, 100%), 1fr))" }}>
          <label className="fl">
            City
            <input className="in sm" autoComplete="address-level2" value={f.city} onChange={set("city")} />
          </label>
          <label className="fl">
            State
            <select className="in sm" autoComplete="address-level1" value={f.state} onChange={set("state")}>
              {US_STATES.map(([c, n]) => (
                <option key={c} value={c}>
                  {n}
                </option>
              ))}
            </select>
          </label>
          <label className="fl">
            ZIP
            <input className="in sm" inputMode="numeric" autoComplete="postal-code" maxLength={5} value={f.zip} onChange={set("zip")} />
          </label>
        </div>
      </div>
      <div className="card">
        <InsuranceChoice value={ins} onChange={setIns} modes={insuranceModes} />
      </div>
      <ErrorText error={error} />
      <div className="actions">
        <button className="btn" type="submit" disabled={busy}>
          Continue <Arrow />
        </button>
        {onCancel && (
          <button type="button" className="ghost" onClick={onCancel}>
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
