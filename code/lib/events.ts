// Event catalogue (shared). Each event maps to its nearest event in Legion's current PostHog
// instrumentation so a before/after funnel can be compared (see README).
export const EVENT_CATALOG: { name: string; legion: string; note?: string }[] = [
  { name: "onboarding_started", legion: "portal.onboarding.started" },
  { name: "code_failed", legion: "—", note: "wrong text code (demo: 000000)" },
  { name: "code_verified", legion: "— (no equivalent; email code today)" },
  { name: "identity_matched", legion: "— (portal.onboarding.userCreated is the nearest)" },
  { name: "verified_no_match", legion: "—" },
  { name: "coverage_found", legion: "portal.onboarding.insurance_selected" },
  { name: "coverage_not_found", legion: "portal.onboarding.insurance_selected" },
  { name: "prefill_confirmed", legion: "—" },
  { name: "prefill_edited", legion: "—" },
  { name: "manual_fallback", legion: "—", note: "detail = field asked directly" },
  { name: "screen_out", legion: "— (fit check has no submit event today)", note: "detail = reason" },
  { name: "safety_answered", legion: "—", note: "detail = yes / no" },
  { name: "records_ready_at_screen_4", legion: "—", note: "detail = true / false" },
  { name: "concerns_submitted", legion: "portal.onboarding.conditions" },
  { name: "controlled_med_flagged", legion: "—", note: "flag for the clinician; patient never blocked" },
  { name: "snapshot_confirmed", legion: "portal.onboarding.needs" },
  { name: "provider_selected", legion: "portal.provider_selected" },
  { name: "slot_selected", legion: "portal.provider.reservation.created" },
  { name: "agreement_read", legion: "—", note: "detail = document id" },
  { name: "payment_authorized", legion: "— (no payment-success event today)" },
  { name: "booked", legion: "— (payment page reach is the nearest)" },
  { name: "reminder_scheduled", legion: "—" },
  { name: "visit_joined", legion: "—" },
  { name: "visit_completed", legion: "— (not tracked today)" },
  { name: "followup_booked", legion: "—" },
];

/** Funnel steps shown on /debug/funnel, in order. A step counts once per person. */
export const FUNNEL_STEPS: { key: string; label: string }[] = [
  { key: "onboarding_started", label: "Started (screen 1)" },
  { key: "code_verified", label: "Code verified" },
  { key: "identity_confirmed", label: "Details confirmed (screen 2)" },
  { key: "safety_answered:no", label: "Safety check passed (screen 3)" },
  { key: "concerns_submitted", label: "Concerns (screen 4)" },
  { key: "snapshot_confirmed", label: "Health snapshot (screen 5)" },
  { key: "slot_selected", label: "Provider and time (screen 6)" },
  { key: "booked", label: "Booked (screen 7)" },
  { key: "visit_joined", label: "Visit joined" },
  { key: "visit_completed", label: "First visit completed (north star)" },
];
