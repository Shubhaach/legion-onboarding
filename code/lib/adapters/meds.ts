// Medications: fill history and pharmacy. Vendor: DoseSpot (mocked only).
import { medsByPatient, type MedHistory } from "../fixtures";
import { dependsOnIdentity, timedMock } from "./mock";
import type { AdapterResult, AdapterStatus, LookupContext } from "./types";

export const MEDS_SOURCE = "DoseSpot";

export function medHistory(ctx: LookupContext, identity: AdapterStatus): AdapterResult<MedHistory> {
  return dependsOnIdentity(identity, MEDS_SOURCE, () =>
    timedMock(ctx, "medications", MEDS_SOURCE, () => {
      const h = ctx.patientId ? medsByPatient[ctx.patientId] : null;
      return h && h.fills.length ? h : null; // empty history -> ask the patient
    }),
  );
}
