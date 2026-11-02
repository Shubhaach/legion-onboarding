// Shared mock timing. A lookup's status is derived from time elapsed since screen 1
// was submitted, so it is identical on every server instance and needs no background work.
import { scenarioById, type LookupName } from "../fixtures";
import type { AdapterResult, AdapterStatus, LookupContext } from "./types";

export function timedMock<T>(
  ctx: LookupContext,
  name: LookupName,
  source: string,
  load: () => T | null | undefined,
): AdapterResult<T> {
  if (!ctx.consent) return { status: "not_found", data: null, source, note: "No consent to pull data" };
  const scenario = scenarioById(ctx.scenarioId);
  if (!scenario) return { status: "error", data: null, source, note: "Unknown scenario" };
  const outcome = scenario.outcomes[name];
  if (outcome === "skipped") return { status: "not_found", data: null, source, note: "Not run: no identity match" };
  const readyAt = ctx.startedAt + scenario.latencyMs[name];
  if (ctx.now < readyAt || outcome === "pending") return { status: "pending", data: null, source };
  if (outcome === "not_found") return { status: "not_found", data: null, source, readyAt, note: "Nothing found" };
  const data = load();
  if (data == null) return { status: "not_found", data: null, source, readyAt, note: "Nothing found" };
  return { status: "ready", data, source, readyAt };
}

export function sandboxUnavailable<T>(source: string): AdapterResult<T> {
  return { status: "error", data: null, source, note: "Sandbox adapter not configured in this prototype" };
}

/** Coverage, records and meds run on the matched identity. Without a match they return nothing. */
export function dependsOnIdentity<T>(identity: AdapterStatus, source: string, run: () => AdapterResult<T>): AdapterResult<T> {
  if (identity === "pending") return { status: "pending", data: null, source };
  if (identity !== "ready") return { status: "not_found", data: null, source, note: "Not run: no identity match" };
  return run();
}
