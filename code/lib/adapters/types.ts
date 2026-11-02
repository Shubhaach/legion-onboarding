export type AdapterStatus = "ready" | "pending" | "not_found" | "error";

export interface AdapterResult<T> {
  status: AdapterStatus;
  data: T | null;
  /** Vendor behind this lookup. Shown only in the demo panel, never in the patient UI. */
  source: string;
  /** When the result arrived (ms since epoch), if it has. */
  readyAt?: number;
  /** Why there is no data (demo panel only). */
  note?: string;
}

/** What every adapter receives: who to look up and when screen 1 was submitted. */
export interface LookupContext {
  scenarioId: string;
  patientId: string | null;
  /** Date of birth the patient typed on screen 1 (YYYY-MM-DD). */
  dob: string;
  startedAt: number;
  consent: boolean;
  now: number;
}

export type AdapterMode = "mock" | "sandbox";

export function adapterMode(): AdapterMode {
  return process.env.ADAPTER_MODE === "sandbox" ? "sandbox" : "mock";
}
