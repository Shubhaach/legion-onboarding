// Screen 4: map the patient's own words to a fixed taxonomy. Shared keyword fallback.
import { concerns } from "./fixtures";

export const CONCERN_IDS = concerns.map((c) => c.id);

export function keywordConcerns(text: string): string[] {
  const t = text.toLowerCase();
  return concerns.filter((c) => c.keywords.some((k) => t.includes(k))).map((c) => c.id);
}

export function concernLabel(id: string): string {
  return concerns.find((c) => c.id === id)?.label ?? id;
}

// Words that should surface crisis resources on screen 4 even after the safety check.
const CRISIS_WORDS = ["suicid", "kill myself", "end my life", "hurt myself", "self-harm", "self harm", "don't want to live", "dont want to live"];

export function mentionsCrisis(text: string): boolean {
  const t = text.toLowerCase();
  return CRISIS_WORDS.some((w) => t.includes(w));
}
