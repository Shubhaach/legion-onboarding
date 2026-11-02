// Records: past diagnoses and hospital stays from HIE networks. Vendor: Metriport. Slow and async.
import { recordsByPatient, type Records } from "../fixtures";
import { dependsOnIdentity, sandboxUnavailable, timedMock } from "./mock";
import { adapterMode, type AdapterResult, type AdapterStatus, type LookupContext } from "./types";

export const RECORDS_SOURCE = "Metriport";

export function queryRecords(ctx: LookupContext, identity: AdapterStatus): AdapterResult<Records> {
  if (adapterMode() === "sandbox" && !process.env.METRIPORT_API_KEY) return sandboxUnavailable(RECORDS_SOURCE);
  return dependsOnIdentity(identity, RECORDS_SOURCE, () =>
    timedMock(ctx, "records", RECORDS_SOURCE, () => (ctx.patientId ? recordsByPatient[ctx.patientId] : null)),
  );
}
