// Step 4 + 5: build one clip per segment, join them with 0.3 s crossfades, write captions, print timings.
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { AUDIO, CLIPS, DEMO, FPS, H, LEAD, OUT_MP4, OUT_SRT, SLIDES, TAIL, W, XFADE, duration, ensureDir, fmt, narration, readJson, requireBins, run, toFrame } from "./lib.mjs";

const ENC = ["-c:v", "libx264", "-preset", "veryfast", "-crf", "20", "-pix_fmt", "yuv420p", "-r", String(FPS)];
const AENC = ["-c:a", "aac", "-b:a", "160k", "-ar", "48000", "-ac", "2"];

function segmentClip(seg, i, audioDur, steps) {
  const out = join(CLIPS, `${String(i + 1).padStart(2, "0")}-${seg.id}.mp4`);
  const wav = join(AUDIO, `${seg.id}.wav`);
  const delay = Math.round(LEAD * 1000);
  let D;
  if (seg.kind === "slide") {
    D = toFrame(LEAD + audioDur + TAIL);
    const png = join(SLIDES, `slide-${String(seg.slide).padStart(2, "0")}.png`);
    run("ffmpeg", [
      "-y", "-v", "error", "-loop", "1", "-framerate", String(FPS), "-t", String(D), "-i", png, "-i", wav,
      "-filter_complex", `[0:v]format=yuv420p[v];[1:a]adelay=${delay}|${delay},apad,atrim=0:${D}[a]`,
      "-map", "[v]", "-map", "[a]", "-t", String(D), ...ENC, ...AENC, out,
    ]);
  } else {
    const step = steps.find((s) => s.id === seg.id);
    if (!step) throw new Error(`No recording for ${seg.id}; run the record step first.`);
    D = toFrame(step.end - step.start);
    run("ffmpeg", [
      "-y", "-v", "error", "-i", join(DEMO, step.video), "-i", wav,
      "-filter_complex",
      `[0:v]trim=start=${step.start}:duration=${D},setpts=PTS-STARTPTS,fps=${FPS},scale=${W}:${H}:flags=lanczos,format=yuv420p,tpad=stop_mode=clone:stop_duration=1[v];` +
        `[1:a]adelay=${delay}|${delay},apad,atrim=0:${D}[a]`,
      "-map", "[v]", "-map", "[a]", "-t", String(D), ...ENC, ...AENC, out,
    ]);
  }
  return { out, D };
}

function srtTime(s) {
  const ms = Math.max(0, Math.round(s * 1000));
  const p = (n, w = 2) => String(n).padStart(w, "0");
  return `${p(Math.floor(ms / 3_600_000))}:${p(Math.floor(ms / 60_000) % 60)}:${p(Math.floor(ms / 1000) % 60)},${p(ms % 1000, 3)}`;
}

/** Split narration into caption-sized chunks (sentences, then commas), at most ~84 chars. */
function chunks(text, max = 84) {
  const sentences = text.match(/[^.!?]+[.!?]+["')]?\s*|[^.!?]+$/g).map((s) => s.trim());
  const out = [];
  for (const s of sentences) {
    if (s.length <= max) { out.push(s); continue; }
    let cur = "";
    for (const part of s.split(/(?<=[,:;])\s+/)) {
      if (cur && (cur + " " + part).length > max) { out.push(cur); cur = part; }
      else cur = cur ? `${cur} ${part}` : part;
    }
    if (cur) out.push(cur);
  }
  // Wrap each chunk onto at most two lines.
  return out.flatMap((c) => {
    if (c.length <= max) return [wrap2(c)];
    const words = c.split(" "); const half = Math.ceil(words.length / 2);
    return [wrap2(words.slice(0, half).join(" ")), wrap2(words.slice(half).join(" "))];
  });
}
function wrap2(c) {
  if (c.length <= 42) return c;
  const mid = c.length / 2;
  let best = -1;
  for (let i = 0; i < c.length; i++) if (c[i] === " " && (best < 0 || Math.abs(i - mid) < Math.abs(best - mid))) best = i;
  return best < 0 ? c : `${c.slice(0, best)}\n${c.slice(best + 1)}`;
}

export function assemble() {
  requireBins("ffmpeg", "ffprobe");
  ensureDir(CLIPS);
  const audio = readJson(join(AUDIO, "durations.json")).segments;
  const steps = narration.segments.some((s) => s.kind === "demo") ? readJson(join(DEMO, "steps.json")) : [];

  const clips = narration.segments.map((seg, i) => ({ seg, audio: audio[seg.id], ...segmentClip(seg, i, audio[seg.id], steps) }));
  // Timeline: each clip overlaps the previous one by XFADE.
  let t = 0;
  for (const [i, c] of clips.entries()) {
    c.at = i === 0 ? 0 : t - XFADE;
    t = c.at + c.D;
  }

  // Crossfade chain (video xfade + audio acrossfade) in one pass.
  const inputs = clips.flatMap((c) => ["-i", c.out]);
  const f = [];
  let v = "[0:v]", a = "[0:a]";
  for (let i = 1; i < clips.length; i++) {
    const vo = i === clips.length - 1 ? "[vout]" : `[v${i}]`;
    const ao = i === clips.length - 1 ? "[aout]" : `[a${i}]`;
    f.push(`${v}[${i}:v]xfade=transition=fade:duration=${XFADE}:offset=${clips[i].at.toFixed(4)}${vo}`);
    f.push(`${a}[${i}:a]acrossfade=d=${XFADE}:c1=tri:c2=tri${ao}`);
    v = vo; a = ao;
  }
  run("ffmpeg", ["-y", "-v", "error", ...inputs, "-filter_complex", f.join(";"), "-map", "[vout]", "-map", "[aout]", ...ENC, ...AENC, "-movflags", "+faststart", OUT_MP4]);

  // Captions from the narration text and the real segment timings.
  let n = 0;
  const srt = [];
  for (const c of clips) {
    const parts = chunks(c.seg.text);
    const total = parts.reduce((s, p) => s + p.length, 0);
    let s0 = c.at + LEAD;
    for (const p of parts) {
      const d = (c.audio * p.length) / total;
      srt.push(`${++n}\n${srtTime(s0)} --> ${srtTime(s0 + d)}\n${p}\n`);
      s0 += d;
    }
  }
  writeFileSync(OUT_SRT, srt.join("\n"));

  // Check.
  const total = duration(OUT_MP4);
  console.log("\nSegment            kind   starts   length  narration");
  for (const c of clips)
    console.log(`${c.seg.id.padEnd(18)} ${c.seg.kind.padEnd(6)} ${fmt(c.at).padStart(7)}  ${c.D.toFixed(1).padStart(5)}s  ${c.audio.toFixed(1).padStart(5)}s`);
  console.log(`\nTotal: ${fmt(total)} (${total.toFixed(1)}s)  ->  ${OUT_MP4.replace(process.cwd() + "/", "")}`);
  const lo = 4 * 60 + 45, hi = 5 * 60 + 30;
  if (total > hi) {
    const over = total - hi;
    const byLength = [...clips].sort((x, y) => y.D - x.D).slice(0, 4).map((c) => `${c.seg.id} (${c.D.toFixed(1)}s)`);
    const byHold = [...clips].filter((c) => c.seg.kind === "demo").sort((x, y) => (y.D - y.audio) - (x.D - x.audio)).slice(0, 3)
      .map((c) => `${c.seg.id} (+${(c.D - c.audio).toFixed(1)}s beyond narration)`);
    console.log(`Over target by ${over.toFixed(1)}s. Trim candidates: ${byLength.join(", ")}. Longest silent demo time: ${byHold.join(", ")}.`);
  } else if (total < lo) console.log(`Under the 4:45 target by ${(lo - total).toFixed(1)}s.`);
  else console.log("Within the 4:45–5:30 target.");
  return { total, clips };
}

if (import.meta.url === `file://${process.argv[1]}`) assemble();
