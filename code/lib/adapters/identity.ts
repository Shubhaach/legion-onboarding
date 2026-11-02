// Identity: phone + date of birth -> name and address. Vendor: Verified (mocked only).
import { patientById, type Patient } from "../fixtures";
import { timedMock } from "./mock";
import type { AdapterResult, LookupContext } from "./types";

export const IDENTITY_SOURCE = "Verified";

export function lookupIdentity(ctx: LookupContext): AdapterResult<Patient> {
  // Verified stays mocked in every mode (CLAUDE.md).
  return timedMock(ctx, "identity", IDENTITY_SOURCE, () => {
    const p = patientById(ctx.patientId);
    // A match needs both phone and date of birth. Any doubt becomes a question for the patient.
    return p && p.dob === ctx.dob ? p : null;
  });
}
