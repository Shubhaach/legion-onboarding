// Server-only: Claude maps free text to the fixed taxonomy. Falls back to keywords when
// there is no API key, on any error or refusal, or after a short timeout.
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { concerns } from "./fixtures";
import { CONCERN_IDS, keywordConcerns } from "./concerns";

const Result = z.object({
  concerns: z.array(z.enum(CONCERN_IDS as [string, ...string[]])),
});

const SYSTEM = `You help a psychiatry practice's intake form. A patient has described, in their own words, why they want care.
Map what they wrote to zero or more of these concern categories, and nothing else:
${concerns.map((c) => `- ${c.id}: ${c.label}`).join("\n")}

Rules:
- Only choose a category the text clearly supports. Do not guess or add related categories.
- These are the patient's concerns, not diagnoses. Never infer a diagnosis.
- If they describe a concern that fits none of the categories, return ["other"].
- If the text is empty or not about their health, return [].`;

export async function aiConcerns(text: string): Promise<{ ids: string[]; source: "ai" | "keywords" }> {
  const fallback = { ids: keywordConcerns(text), source: "keywords" as const };
  if (!process.env.ANTHROPIC_API_KEY || !text.trim()) return fallback;
  try {
    const client = new Anthropic({ timeout: 8000, maxRetries: 0 });
    const response = await client.messages.parse({
      model: "claude-opus-5-5",
      max_tokens: 2000,
      output_config: { effort: "low", format: zodOutputFormat(Result) },
      system: SYSTEM,
      messages: [{ role: "user", content: `Patient's words:\n"""${text.slice(0, 600)}"""` }],
    });
    if (response.stop_reason === "refusal" || !response.parsed_output) return fallback;
    const ids = [...new Set(response.parsed_output.concerns)];
    return { ids, source: "ai" };
  } catch (e) {
    console.warn("concerns: AI call failed, using keyword fallback", e instanceof Error ? e.message : e);
    return fallback;
  }
}
