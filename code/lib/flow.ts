// Which screen a patient may see, from session state alone (shared by server and client).
import type { Session } from "./session";

export const STEPS = [
  "/start",
  "/confirm",
  "/safety",
  "/concerns",
  "/snapshot",
  "/provider",
  "/book",
  "/booked",
  "/visit",
  "/visit-complete",
] as const;

export type StepPath = (typeof STEPS)[number] | "/crisis";

/** Progress number shown in the header ("N of 7"), or null for screens without it. */
export function progressFor(path: string): number | null {
  const i = STEPS.indexOf(path as (typeof STEPS)[number]);
  return i >= 0 && i < 7 ? i + 1 : null;
}

export function nextPath(s: Session | null): StepPath {
  if (!s || !s.codeVerified) return "/start";
  if (s.safety === "yes") return "/crisis";
  if (s.screenOut === "state" || !s.identity || !s.insurance) return "/confirm";
  if (!s.safety) return "/safety";
  if (!s.concerns) return "/concerns";
  if (!s.snapshot) return "/snapshot";
  if (!s.slot) return "/provider";
  if (!s.bookedAt) return "/book";
  if (!s.visitCompletedAt) return s.visitJoinedAt ? "/visit" : "/booked";
  return "/visit-complete";
}

export function isAllowed(path: string, s: Session | null): boolean {
  if (path === "/start") return true;
  const np = nextPath(s);
  if (np === "/crisis") return path === "/crisis";
  if (path === "/crisis") return false;
  if (s?.bookedAt) {
    // After booking, the earlier screens are closed; the visit screens are open.
    if (path === "/booked" || path === "/visit") return true;
    return path === "/visit-complete" && !!s.visitCompletedAt;
  }
  const want = STEPS.indexOf(path as (typeof STEPS)[number]);
  const have = STEPS.indexOf(np as (typeof STEPS)[number]);
  return want >= 0 && want <= have && want <= STEPS.indexOf("/book");
}
