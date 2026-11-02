// Screen 6 ranking: specialty fit with the patient's confirmed concerns, then availability.
import { concernForCode, providers, type Provider } from "./fixtures";
import type { Session } from "./session";

export interface RankedProvider {
  provider: Provider;
  score: number;
  label: "Recommended" | "Soonest available" | null;
  first: { dayOffset: number; time: string };
}

export function relevantConcerns(s: Session | null): string[] {
  const ids = new Set((s?.concerns?.ids ?? []).filter((id) => id !== "other"));
  for (const [code, a] of Object.entries(s?.concerns?.recordAnswers ?? {})) {
    const c = concernForCode(code);
    if (a === "yes" && c) ids.add(c);
  }
  return [...ids];
}

const firstSlot = (p: Provider) => {
  const day = [...p.slots].sort((a, b) => a.dayOffset - b.dayOffset)[0];
  return { dayOffset: day.dayOffset, time: [...day.times].sort()[0] };
};
const slotKey = (f: { dayOffset: number; time: string }) => f.dayOffset * 10000 + Number(f.time.replace(":", ""));

export function rankProviders(s: Session | null): RankedProvider[] {
  const want = relevantConcerns(s);
  const ranked = providers
    .map((p) => {
      const fit = p.specialties.filter((x) => want.includes(x)).length;
      const first = firstSlot(p);
      return { provider: p, score: fit * 10 - first.dayOffset * 0.5, fit, first, label: null as RankedProvider["label"] };
    })
    .sort((a, b) => b.score - a.score || slotKey(a.first) - slotKey(b.first));

  const soonest = [...ranked].sort((a, b) => slotKey(a.first) - slotKey(b.first))[0];
  // Legion's pattern: best fit first, soonest second, then the rest.
  const ordered = [ranked[0], ...(soonest !== ranked[0] ? [soonest] : []), ...ranked.filter((r) => r !== ranked[0] && r !== soonest)];
  let recommended = 0;
  for (const r of ordered) {
    if (r === soonest && r !== ordered[0]) r.label = "Soonest available";
    else if (r.fit > 0 && recommended < 2) {
      r.label = "Recommended";
      recommended++;
    }
  }
  if (!ordered[0].label) ordered[0].label = ordered[0] === soonest ? "Soonest available" : null;
  return ordered.map(({ provider, score, label, first }) => ({ provider, score, label, first }));
}
