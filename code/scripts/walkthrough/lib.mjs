// Shared paths and helpers for the walkthrough pipeline (see ../docs/walkthrough/SPEC.md).
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../.."); // code/
export const REPO = resolve(ROOT, ".."); // repository root (docs/ lives here)
export const WALK = join(REPO, "docs/walkthrough");
export const BUILD = join(WALK, ".build"); // intermediate files, gitignored
export const AUDIO = join(BUILD, "audio");
export const SLIDES = join(BUILD, "slides");
export const DEMO = join(BUILD, "demo");
export const CLIPS = join(BUILD, "clips");
export const OUT_MP4 = join(WALK, "walkthrough.mp4");
export const OUT_SRT = join(WALK, "walkthrough.srt");

export const W = 1920;
export const H = 1080;
export const FPS = 30;
export const XFADE = 0.3; // crossfade between segments, seconds
export const LEAD = 0.15; // silence before each narration, seconds
export const TAIL = 0.45; // silence after each narration, seconds (covers the crossfade)

export const narration = JSON.parse(readFileSync(join(WALK, "narration.json"), "utf8"));

/** The deck: deck.pdf per the spec, else the only PDF in docs/walkthrough/. */
export function deckPath() {
  const named = join(WALK, "deck.pdf");
  if (existsSync(named)) return named;
  const pdfs = readdirSync(WALK).filter((f) => f.toLowerCase().endsWith(".pdf"));
  if (pdfs.length === 1) return join(WALK, pdfs[0]);
  throw new Error(`Put the deck at docs/walkthrough/deck.pdf (found ${pdfs.length} PDFs).`);
}

export function ensureDir(d) {
  mkdirSync(d, { recursive: true });
  return d;
}

/** Run a binary without a shell (no quoting issues, nothing interpolated). */
export function run(bin, args, opts = {}) {
  return execFileSync(bin, args, { encoding: "utf8", maxBuffer: 64 * 1024 * 1024, stdio: ["ignore", "pipe", "pipe"], ...opts });
}

export function duration(file) {
  return Number(run("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", file]).trim());
}

export function readJson(file) {
  return JSON.parse(readFileSync(file, "utf8"));
}

export function writeJson(file, data) {
  ensureDir(dirname(file));
  writeFileSync(file, JSON.stringify(data, null, 2) + "\n");
}

/** Round up to a whole frame so per-segment clips line up exactly. */
export const toFrame = (s) => Math.ceil(s * FPS - 1e-6) / FPS;

export const fmt = (s) => `${Math.floor(s / 60)}:${(s % 60).toFixed(1).padStart(4, "0")}`;

export function requireBins(...bins) {
  for (const b of bins) {
    try {
      execFileSync("which", [b], { stdio: "ignore" });
    } catch {
      throw new Error(`Missing ${b}. Install with: brew install ${b === "pdftoppm" ? "poppler" : b === "ffprobe" ? "ffmpeg" : b}`);
    }
  }
}
