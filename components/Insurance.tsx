"use client";
import { useState } from "react";
import { selfPayFirstVisit } from "@/lib/fixtures";

export type InsuranceMode = "pulled" | "manual" | "card_photo" | "self_pay";
export interface InsuranceValue {
  insuranceMode: InsuranceMode | "";
  payer: string;
  memberId: string;
}

const LABELS: Record<InsuranceMode, string> = {
  pulled: "Keep the plan we found",
  manual: "I have insurance",
  card_photo: "Upload a photo of my insurance card",
  self_pay: `I'll pay myself: $${selfPayFirstVisit} first visit`,
};

/** How the patient will pay when we couldn't pull (or they changed) their plan. */
export function InsuranceChoice({
  value,
  onChange,
  modes,
}: {
  value: InsuranceValue;
  onChange: (v: InsuranceValue) => void;
  modes: InsuranceMode[];
}) {
  const [fileName, setFileName] = useState("");
  return (
    <fieldset style={{ border: 0, padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 10 }}>
      <legend className="lbl" style={{ marginBottom: 10 }}>How will you pay for visits?</legend>
      {modes.map((m) => (
        <div key={m} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <label style={{ display: "flex", gap: 12, alignItems: "center", fontSize: 15, cursor: "pointer", minHeight: 32 }}>
            <input type="radio" name="insuranceMode" className="check" style={{ margin: 0 }} checked={value.insuranceMode === m} onChange={() => onChange({ ...value, insuranceMode: m })} />
            {LABELS[m]}
          </label>
          {value.insuranceMode === "manual" && m === "manual" && (
            <div className="grid-2" style={{ paddingLeft: 32, gridTemplateColumns: "repeat(auto-fit, minmax(min(200px, 100%), 1fr))" }}>
              <label className="fl">
                Insurance company
                <input className="in sm" value={value.payer} onChange={(e) => onChange({ ...value, payer: e.target.value })} />
              </label>
              <label className="fl">
                Member ID (optional)
                <input className="in sm" value={value.memberId} onChange={(e) => onChange({ ...value, memberId: e.target.value })} />
              </label>
              <span className="lbl" style={{ gridColumn: "1 / -1" }}>We&apos;ll confirm your coverage and copay before your visit.</span>
            </div>
          )}
          {value.insuranceMode === "card_photo" && m === "card_photo" && (
            <div style={{ paddingLeft: 32, display: "flex", flexDirection: "column", gap: 8 }}>
              <label className="btn2" style={{ alignSelf: "flex-start" }}>
                {fileName ? "Choose a different photo" : "Choose photo"}
                <input type="file" accept="image/*" capture="environment" className="sr-only" onChange={(e) => setFileName(e.target.files?.[0]?.name ?? "")} />
              </label>
              <span className="lbl">
                {fileName ? `Added: ${fileName}. ` : ""}We&apos;ll read your card and confirm your copay before your visit. If your plan doesn&apos;t cover it, the first visit is ${selfPayFirstVisit}. (Prototype: the photo stays on your device.)
              </span>
            </div>
          )}
          {value.insuranceMode === "self_pay" && m === "self_pay" && (
            <span className="lbl" style={{ paddingLeft: 32 }}>
              Covers your 60-minute first visit with a psychiatric nurse practitioner. HSA and FSA cards work.
            </span>
          )}
        </div>
      ))}
    </fieldset>
  );
}
