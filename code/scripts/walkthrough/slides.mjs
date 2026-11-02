// Step 2: render every deck page to a 1920x1080 PNG (letterboxed on white if the page isn't 16:9).
import { readdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { H, SLIDES, W, deckPath, ensureDir, requireBins, run } from "./lib.mjs";

export function slides() {
  requireBins("pdftoppm", "ffmpeg");
  const deck = deckPath();
  rmSync(SLIDES, { recursive: true, force: true });
  ensureDir(SLIDES);
  run("pdftoppm", ["-png", "-scale-to-x", String(W), "-scale-to-y", "-1", deck, join(SLIDES, "raw")]);
  const raws = readdirSync(SLIDES).filter((f) => f.startsWith("raw")).sort();
  raws.forEach((f, i) => {
    run("ffmpeg", [
      "-y", "-v", "error", "-i", join(SLIDES, f),
      "-vf", `scale=${W}:${H}:force_original_aspect_ratio=decrease:flags=lanczos,pad=${W}:${H}:(ow-iw)/2:(oh-ih)/2:white`,
      join(SLIDES, `slide-${String(i + 1).padStart(2, "0")}.png`),
    ]);
    rmSync(join(SLIDES, f));
  });
  console.log(`Slides: ${raws.length} pages from ${deck.split("/").pop()} -> ${W}x${H} PNG`);
  return raws.length;
}

if (import.meta.url === `file://${process.argv[1]}`) slides();
