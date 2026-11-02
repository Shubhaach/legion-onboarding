// Step 1: narration audio for every segment, plus its measured duration.
// Default: macOS `say` with the best installed English voice (Premium > Enhanced > Samantha).
// Overrides (env): WALKTHROUGH_VOICE="Ava (Premium)", WALKTHROUGH_RATE=175,
// WALKTHROUGH_TEMPO=1.1 (pitch-preserving speed-up of any voice; default 1.0).
// Optional cloud TTS, off by default: WALKTHROUGH_TTS=openai (needs OPENAI_API_KEY or OPENAI_KEY; optional
// OPENAI_TTS_VOICE, OPENAI_TTS_INSTRUCTIONS) or WALKTHROUGH_TTS=elevenlabs (needs ELEVENLABS_API_KEY, optional
// ELEVENLABS_VOICE_ID). Keys are read from the environment or .env.local only, and never logged.
import { existsSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { AUDIO, ROOT, duration, ensureDir, narration, requireBins, run, writeJson } from "./lib.mjs";

// Load .env.local (doesn't override variables already set in the shell).
const envFile = join(ROOT, ".env.local");
if (existsSync(envFile)) process.loadEnvFile(envFile);
const openaiKey = () => process.env.OPENAI_API_KEY || process.env.OPENAI_KEY;

export const OPENAI_INSTRUCTIONS =
  process.env.OPENAI_TTS_INSTRUCTIONS ??
  "You are a founder presenting your product walkthrough to a hiring team. Speak warmly and confidently, like a real person talking, " +
    "not reading. Use natural, varied intonation: lift on questions, land key numbers and contrasts with gentle emphasis, and take short " +
    "pauses between sentences and after colons. Conversational pace, upbeat but not salesy.";

export function pickVoice() {
  if (process.env.WALKTHROUGH_VOICE) return process.env.WALKTHROUGH_VOICE;
  const voices = run("say", ["-v", "?"])
    .split("\n")
    .map((l) => l.match(/^(.+?)\s+([a-z]{2}_[A-Z]{2})\s+#/))
    .filter(Boolean)
    .map((m) => ({ name: m[1].trim(), locale: m[2] }))
    .filter((v) => v.locale.startsWith("en_"));
  const rank = (v) => (/\(Premium\)/.test(v.name) ? 0 : /\(Enhanced\)/.test(v.name) ? 1 : 2);
  const us = (v) => (v.locale === "en_US" ? 0 : 1);
  const best = voices.filter((v) => rank(v) < 2).sort((a, b) => rank(a) - rank(b) || us(a) - us(b))[0];
  return best?.name ?? "Samantha";
}

export async function cloudTts(provider, text, outFile, voiceOverride) {
  let res;
  if (provider === "openai") {
    if (!openaiKey()) throw new Error("WALKTHROUGH_TTS=openai needs OPENAI_API_KEY (or OPENAI_KEY) in the env or .env.local");
    res = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: { Authorization: `Bearer ${openaiKey()}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gpt-4o-mini-tts",
        voice: voiceOverride ?? process.env.OPENAI_TTS_VOICE ?? "coral",
        input: text,
        instructions: OPENAI_INSTRUCTIONS,
        response_format: "mp3",
      }),
    });
  } else if (provider === "elevenlabs") {
    if (!process.env.ELEVENLABS_API_KEY) throw new Error("WALKTHROUGH_TTS=elevenlabs needs ELEVENLABS_API_KEY");
    const voice = voiceOverride ?? process.env.ELEVENLABS_VOICE_ID ?? "21m00Tcm4TlvDq8ikWAM";
    res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice}`, {
      method: "POST",
      headers: { "xi-api-key": process.env.ELEVENLABS_API_KEY, "Content-Type": "application/json", Accept: "audio/mpeg" },
      body: JSON.stringify({ text, model_id: "eleven_multilingual_v2" }),
    });
  } else throw new Error(`Unknown WALKTHROUGH_TTS=${provider}`);
  if (!res.ok) throw new Error(`${provider} TTS failed: HTTP ${res.status}`); // never log the key or body
  writeFileSync(outFile, Buffer.from(await res.arrayBuffer()));
}

export async function voice() {
  requireBins("ffmpeg", "ffprobe");
  ensureDir(AUDIO);
  const provider = process.env.WALKTHROUGH_TTS;
  const voiceName = provider === "openai" ? `openai gpt-4o-mini-tts (${process.env.OPENAI_TTS_VOICE ?? "coral"})` : provider ? `${provider} TTS` : pickVoice();
  const rate = process.env.WALKTHROUGH_RATE ?? "175";
  const tempo = Number(process.env.WALKTHROUGH_TEMPO ?? "1");
  console.log(`Voice: ${voiceName}${provider ? "" : ` at ${rate} wpm`}${tempo !== 1 ? `, tempo ${tempo}x` : ""}`);
  const out = { voice: voiceName, rate: provider ? null : Number(rate), tempo, segments: {} };
  for (const seg of narration.segments) {
    const raw = join(AUDIO, `${seg.id}.${provider ? "mp3" : "aiff"}`);
    const wav = join(AUDIO, `${seg.id}.wav`);
    if (provider) await cloudTts(provider, seg.text, raw);
    else {
      const txt = join(AUDIO, `${seg.id}.txt`);
      writeFileSync(txt, seg.text);
      run("say", ["-v", voiceName, "-r", rate, "-f", txt, "-o", raw]);
    }
    run("ffmpeg", ["-y", "-v", "error", "-i", raw, "-af", `atempo=${tempo}`, "-ar", "48000", "-ac", "2", wav]);
    out.segments[seg.id] = duration(wav);
    console.log(`  ${seg.id.padEnd(18)} ${out.segments[seg.id].toFixed(2)}s`);
  }
  writeJson(join(AUDIO, "durations.json"), out);
  return out;
}

if (import.meta.url === `file://${process.argv[1]}`) await voice();
