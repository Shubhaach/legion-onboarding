// Step 1: narration audio for every segment, plus its measured duration.
// Default: macOS `say` with the best installed English voice (Premium > Enhanced > Samantha).
// Overrides (env): WALKTHROUGH_VOICE="Ava (Premium)", WALKTHROUGH_RATE=175.
// Optional cloud TTS, off by default: WALKTHROUGH_TTS=openai (needs OPENAI_API_KEY) or
// WALKTHROUGH_TTS=elevenlabs (needs ELEVENLABS_API_KEY, optional ELEVENLABS_VOICE_ID). Keys are read from env only.
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { AUDIO, duration, ensureDir, narration, requireBins, run, writeJson } from "./lib.mjs";

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

async function cloudTts(provider, text, outFile) {
  let res;
  if (provider === "openai") {
    if (!process.env.OPENAI_API_KEY) throw new Error("WALKTHROUGH_TTS=openai needs OPENAI_API_KEY");
    res = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "gpt-4o-mini-tts", voice: process.env.OPENAI_TTS_VOICE ?? "alloy", input: text, response_format: "mp3" }),
    });
  } else if (provider === "elevenlabs") {
    if (!process.env.ELEVENLABS_API_KEY) throw new Error("WALKTHROUGH_TTS=elevenlabs needs ELEVENLABS_API_KEY");
    const voice = process.env.ELEVENLABS_VOICE_ID ?? "21m00Tcm4TlvDq8ikWAM";
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
  const voiceName = provider ? `${provider} TTS` : pickVoice();
  const rate = process.env.WALKTHROUGH_RATE ?? "175";
  console.log(`Voice: ${voiceName}${provider ? "" : ` at ${rate} wpm`}`);
  const out = { voice: voiceName, rate: provider ? null : Number(rate), segments: {} };
  for (const seg of narration.segments) {
    const raw = join(AUDIO, `${seg.id}.${provider ? "mp3" : "aiff"}`);
    const wav = join(AUDIO, `${seg.id}.wav`);
    if (provider) await cloudTts(provider, seg.text, raw);
    else {
      const txt = join(AUDIO, `${seg.id}.txt`);
      writeFileSync(txt, seg.text);
      run("say", ["-v", voiceName, "-r", rate, "-f", txt, "-o", raw]);
    }
    run("ffmpeg", ["-y", "-v", "error", "-i", raw, "-ar", "48000", "-ac", "2", wav]);
    out.segments[seg.id] = duration(wav);
    console.log(`  ${seg.id.padEnd(18)} ${out.segments[seg.id].toFixed(2)}s`);
  }
  writeJson(join(AUDIO, "durations.json"), out);
  return out;
}

if (import.meta.url === `file://${process.argv[1]}`) await voice();
