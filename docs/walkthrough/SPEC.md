# Walkthrough video: build spec

Goal: one ~5-minute 1080p MP4 that plays the deck and a live, browser-driven demo of the prototype,
narrated by an AI voice. Narration and order are in `narration.json`. All data shown is synthetic.

## Inputs

| File | What |
|---|---|
| `narration.json` | Segments in order: `slide` (deck page) or `demo` (live site step), each with its narration text |
| `deck.pdf` | The deck exported from Claude Slides (Share › Export › PDF), 10 pages |

## Pipeline (scripts in `scripts/walkthrough/`)

1. **Voice.** For each segment, synthesize the narration to audio and measure its duration.
   - Default: macOS `say`. Use the best installed voice (`say -v '?'`); prefer a Premium/Enhanced English voice
     (e.g. "Ava (Premium)", "Zoe (Premium)"), else "Samantha". Rate ~175 wpm. Voice name configurable by env var.
   - If `OPENAI_API_KEY` or `ELEVENLABS_API_KEY` is set, that provider may be used instead (flag, off by default).
2. **Slides.** Render each page of `deck.pdf` to a 1920×1080 PNG.
3. **Demo recording.** One Playwright script drives the live URL (`liveUrl`) at 1920×1080 with `recordVideo`,
   reusing the selectors from the existing Playwright tests.
   - Feels like an agent driving a browser: inject a visible cursor dot that glides to each element before a
     click or type, a soft highlight ring on the target, and human-paced typing.
   - Each demo step runs its `action`, then **holds until that step's audio duration has elapsed**, so the
     picture and narration stay in sync. Log each step's start/end time in the recording.
   - Keep the demo panel open (it shows lookups landing). Fresh session (new browser context) for each new
     `scenario`. Use the demo panel's fast-forward for waits longer than ~2 s.
4. **Assemble** with ffmpeg: slide PNG + its audio; demo video cut by the logged step times + their audio;
   concat in `narration.json` order. Gentle 0.3 s crossfades between segments. H.264, `-preset veryfast`,
   30 fps, AAC audio. Also write `walkthrough.srt` captions from the narration and segment timings.
5. **Check.** Print total length and per-segment lengths. Target 4:45–5:30. If over, report which segments
   to trim; don't rewrite the narration.

## Outputs

- `docs/walkthrough/walkthrough.mp4` (do **not** commit; add to `.gitignore`)
- `docs/walkthrough/walkthrough.srt` (commit)
- `scripts/walkthrough/*` (commit), with one command: `npm run walkthrough`

## Rules

- Never show real personal data. Only the demo phone numbers in `narration.json`.
- No secrets in scripts, logs or the video. Read API keys from env only.
- Don't change the app to make the video work. If a selector is missing, report it.
