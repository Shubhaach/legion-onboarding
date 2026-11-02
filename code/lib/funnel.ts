// In-memory funnel counts for /debug/funnel. Per server instance and reset on deploy:
// good enough for a demo, not for analytics (see ../docs/decisions.md).
import { FUNNEL_STEPS } from "./events";

interface Store {
  people: Map<string, Set<string>>;
  screenOuts: Map<string, number>;
  fallbacks: Map<string, number>;
  since: number;
}

const g = globalThis as unknown as { __lhFunnel?: Store };
const store: Store = (g.__lhFunnel ??= {
  people: new Map(),
  screenOuts: new Map(),
  fallbacks: new Map(),
  since: Date.now(),
});

const IDENTITY_KEYS = new Set(["prefill_confirmed", "prefill_edited"]);

export function recordFunnel(person: string, name: string, detail?: string) {
  let set = store.people.get(person);
  if (!set) store.people.set(person, (set = new Set()));
  set.add(name);
  if (detail) set.add(`${name}:${detail}`);
  if (IDENTITY_KEYS.has(name) || (name === "manual_fallback" && detail === "identity")) set.add("identity_confirmed");
  if (name === "screen_out" && detail) store.screenOuts.set(detail, (store.screenOuts.get(detail) ?? 0) + 1);
  if (name === "manual_fallback" && detail) store.fallbacks.set(detail, (store.fallbacks.get(detail) ?? 0) + 1);
}

export function funnelSnapshot() {
  const people = [...store.people.values()];
  const steps = FUNNEL_STEPS.map((s) => ({ ...s, count: people.filter((p) => p.has(s.key)).length }));
  return {
    since: store.since,
    steps,
    screenOuts: Object.fromEntries(store.screenOuts),
    fallbacks: Object.fromEntries(store.fallbacks),
  };
}
