// Coverage: insurance discovery + eligibility + copay. Vendor: Sohar Health.
import { coverageByPatient, type Coverage } from "../fixtures";
import { dependsOnIdentity, sandboxUnavailable, timedMock } from "./mock";
import { adapterMode, type AdapterResult, type AdapterStatus, type LookupContext } from "./types";

export const COVERAGE_SOURCE = "Sohar";

export function discoverAndVerify(ctx: LookupContext, identity: AdapterStatus): AdapterResult<Coverage> {
  if (adapterMode() === "sandbox" && !process.env.SOHAR_API_KEY) return sandboxUnavailable(COVERAGE_SOURCE);
  return dependsOnIdentity(identity, COVERAGE_SOURCE, () =>
    timedMock(ctx, "coverage", COVERAGE_SOURCE, () => (ctx.patientId ? coverageByPatient[ctx.patientId] : null)),
  );
}
