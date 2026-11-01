// Typed access to the synthetic fixtures in data/fixtures. No real patient data.
import scenariosJson from "@/data/fixtures/scenarios.json";
import patientsJson from "@/data/fixtures/patients.json";
import coverageJson from "@/data/fixtures/coverage.json";
import recordsJson from "@/data/fixtures/records.json";
import medicationsJson from "@/data/fixtures/medications.json";
import providersJson from "@/data/fixtures/providers.json";
import concernsJson from "@/data/fixtures/concerns.json";
import agreementsJson from "@/data/fixtures/agreements.json";
import remindersJson from "@/data/fixtures/reminders.json";

export type LookupName = "identity" | "coverage" | "medications" | "records";
export type Outcome = "ready" | "not_found" | "pending" | "skipped";

export interface Scenario {
  id: string;
  phone: string;
  label: string;
  patientId: string | null;
  latencyMs: Record<LookupName, number>;
  outcomes: Record<LookupName, Outcome>;
}

export interface Address {
  line1: string;
  city: string;
  state: string;
  zip: string;
}

export interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  dob: string; // YYYY-MM-DD
  phone: string;
  email: string;
  address: Address;
}

export interface Coverage {
  status: string;
  payer: string;
  plan: string;
  memberId: string;
  inNetwork: boolean;
  behavioralHealthCarveOut: boolean;
  carveOutAdministrator?: string;
  copay: number;
  deductible: { individual: number; met: number };
  coinsurancePct: number;
}

export interface Condition {
  code: string;
  display: string;
  recordedYear: number;
  source: string;
}

export interface Records {
  conditions: Condition[];
  hospitalStaysPastYear: unknown[];
}

export interface Fill {
  name: string;
  strength: string;
  lastFilledDaysAgo: number;
  controlled: boolean;
  schedule?: string;
  class?: string;
}

export interface Pharmacy {
  name: string;
  address: string;
}

export interface MedHistory {
  fills: Fill[];
  pharmacy: Pharmacy;
}

export interface Provider {
  id: string;
  name: string;
  credential: string;
  initials: string;
  specialties: string[];
  tags: string[];
  eveningHours: boolean;
  slots: { dayOffset: number; times: string[] }[];
}

export interface Concern {
  id: string;
  label: string;
  keywords: string[];
}

export interface Agreement {
  id: string;
  title: string;
  sections: { heading: string; body: string }[];
}

export interface Reminder {
  id: string;
  sendAt: string;
  text: string;
}

export const scenarios = scenariosJson.scenarios as Scenario[];
export const patients = patientsJson.patients as Patient[];
export const servedStates = patientsJson.servedStates as string[];
export const coverageByPatient = coverageJson.coverage as Record<string, Coverage | null>;
export const selfPayFirstVisit = coverageJson.selfPayFirstVisit as number;
export const recordsByPatient = recordsJson.records as Record<string, Records>;
export const medsByPatient = medicationsJson.medications as Record<string, MedHistory>;
export const providers = providersJson.providers as Provider[];
export const visitInfo = providersJson.visit as { type: string; minutes: number };
export const concerns = concernsJson.concerns as Concern[];
export const agreements = agreementsJson.agreements as Agreement[];
export const reminders = remindersJson.messages as Reminder[];

export const NO_MATCH_SCENARIO = "no_match";

/** Unknown phone numbers behave like "identity not matched" (see docs/decisions.md). */
export function scenarioForPhone(phone: string): Scenario {
  return (
    scenarios.find((s) => s.phone === phone) ??
    (scenarios.find((s) => s.id === NO_MATCH_SCENARIO) as Scenario)
  );
}

export function scenarioById(id: string): Scenario | undefined {
  return scenarios.find((s) => s.id === id);
}

export function patientById(id: string | null): Patient | undefined {
  return id ? patients.find((p) => p.id === id) : undefined;
}

export function providerById(id: string): Provider | undefined {
  return providers.find((p) => p.id === id);
}

export const US_STATES: [string, string][] = [
  ["AL", "Alabama"], ["AK", "Alaska"], ["AZ", "Arizona"], ["AR", "Arkansas"], ["CA", "California"],
  ["CO", "Colorado"], ["CT", "Connecticut"], ["DE", "Delaware"], ["DC", "District of Columbia"],
  ["FL", "Florida"], ["GA", "Georgia"], ["HI", "Hawaii"], ["ID", "Idaho"], ["IL", "Illinois"],
  ["IN", "Indiana"], ["IA", "Iowa"], ["KS", "Kansas"], ["KY", "Kentucky"], ["LA", "Louisiana"],
  ["ME", "Maine"], ["MD", "Maryland"], ["MA", "Massachusetts"], ["MI", "Michigan"], ["MN", "Minnesota"],
  ["MS", "Mississippi"], ["MO", "Missouri"], ["MT", "Montana"], ["NE", "Nebraska"], ["NV", "Nevada"],
  ["NH", "New Hampshire"], ["NJ", "New Jersey"], ["NM", "New Mexico"], ["NY", "New York"],
  ["NC", "North Carolina"], ["ND", "North Dakota"], ["OH", "Ohio"], ["OK", "Oklahoma"], ["OR", "Oregon"],
  ["PA", "Pennsylvania"], ["RI", "Rhode Island"], ["SC", "South Carolina"], ["SD", "South Dakota"],
  ["TN", "Tennessee"], ["TX", "Texas"], ["UT", "Utah"], ["VT", "Vermont"], ["VA", "Virginia"],
  ["WA", "Washington"], ["WV", "West Virginia"], ["WI", "Wisconsin"], ["WY", "Wyoming"],
];

export function stateName(code: string): string {
  return US_STATES.find(([c]) => c === code)?.[1] ?? code;
}

/** Maps record diagnosis codes to the screen 4 concern taxonomy (used for provider ranking). */
export function concernForCode(code: string): string | undefined {
  if (code.startsWith("F41")) return "anxiety";
  if (code.startsWith("F32") || code.startsWith("F33")) return "depression";
  if (code.startsWith("F43.1")) return "trauma";
  if (code.startsWith("F90")) return "adhd";
  if (code.startsWith("F42")) return "ocd";
  if (code.startsWith("F31")) return "bipolar";
  if (code.startsWith("F51") || code.startsWith("G47")) return "sleep";
  return undefined;
}
