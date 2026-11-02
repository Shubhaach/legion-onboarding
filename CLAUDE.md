# Legion Health: AI-native onboarding prototype

Build a working, deployed web prototype of Legion Health's new patient onboarding for Texas.

**Read first, in order:** `DELIVERABLES.md` → `docs/brief.md` → `docs/PRD.md` → `docs/decisions.md` →
`docs/data-sources.md`. Screen designs: `docs/mockups/*.html` (see "Design").

## Deliverables (full list in DELIVERABLES.md)

1. A deployed, working prototype (public URL).
2. This repo with an **open pull request** (do not merge it), described with `.github/pull_request_template.md`.
3. A README a reviewer can follow in 2 minutes: what it is, live URL, how to run, demo scenarios,
   what's mocked vs real, links to PRD, decisions and walkthrough video.
4. The founder records a ~5 min walkthrough (`docs/walkthrough/script.md`). Make every key decision visible in the UI.
5. Complete AI history in `docs/ai-history/`. Never paste secrets into prompts, code or logs.

Onboarding ends at **first visit completed**, not at booking. The prototype runs through the
"You're booked" screen, a mock visit room, and a visit-completed screen.

## Hard rules

- **No real patient data, ever.** Synthetic data only. No real PHI in code, logs, fixtures or screenshots.
- **No vendor names in the patient UI** (Verified, Sohar, Metriport, DoseSpot). Show data sources only in the demo panel.
- **Never skip or soften the safety question.** "Yes" always routes to the crisis screen.
- **When data is missing or unclear, ask the patient.** Never call a second vendor to resolve a doubt.
- Secrets live in `.env.local`; commit `.env.example` only.
- Keep the UI minimal and match the mockups. Don't add screens or features the PRD doesn't name.

## Stack

- Next.js (App Router) + TypeScript + Tailwind CSS. Deploy on Vercel.
- Server state: in-memory session store keyed by a cookie (no database needed).
- Optional: Anthropic API for screen 4 (`ANTHROPIC_API_KEY`). Must work without it (see screen 4).

## The flow (7 screens + confirmation)

| Route | Screen | Pulled (adapter) | Patient does |
|---|---|---|---|
| `/start` | 1 Get started | none | Phone, date of birth, one consent tick, 6-digit text code (mock: any code works) |
| `/confirm` | 2 Is this you? | identity (Verified), coverage + copay (Sohar) | Confirm, or "Something's wrong" → edit form |
| `/safety` | 3 Safety check | none | Yes / No. Yes → `/crisis` (911, call or text 988), flow stops |
| `/concerns` | 4 What's going on | past diagnoses (Metriport) | Free text or speech → AI concern chips; confirm record items |
| `/snapshot` | 5 Health snapshot | medications + pharmacy (DoseSpot), hospital stays (Metriport) | "Still taking?" toggles; confirm stays; pharmacy |
| `/provider` | 6 Provider + time | provider schedules (mock), copay | Ranked providers; selected one expands to day strip, then times |
| `/book` | 7 Review and book | identity reused, card on file | Read all agreements, sign, book |
| `/booked` | You're booked | none | Add to calendar (.ics), see reminder plan, test camera and mic |
| `/visit` | Visit room (mock) | none | "Join visit" (demo panel can fast-forward to visit time); mock video with provider placeholder; End visit |
| `/visit-complete` | First visit completed | none | Summary: next steps, follow-up booking, pharmacy on file. This is the finish line |

The visit room and completion screens have no mockup: keep them minimal, in the same style as `/booked`.

### Orchestration

On screen 1 submit, start all lookups **in parallel** and move on immediately:
`identity.lookup(phone, dob)` → `coverage.discoverAndVerify(identity)` · `records.query(identity)` (async, slow) · `meds.history(identity)`.
Screens read whatever has arrived. Each adapter returns `{ status: 'ready' | 'pending' | 'not_found' | 'error', data }`.

### Fallbacks (must all work)

| Trigger | Behaviour |
|---|---|
| Identity not matched | Screen 2 becomes a manual form (name, address, insurance) |
| No coverage found | Screen 2 offers card photo upload (mock) or self-pay at $250, price shown |
| Address outside Texas | Screen 2 stops the flow with a clear, kind message |
| Records not ready by screen 4 or 5 | Show the questions directly (concerns chips; "Any hospital stays in the past year?") |
| Medication history empty | Ask "Are you taking any medications?" with add-medication input |

## Adapters

`lib/adapters/{identity,coverage,records,meds}.ts`, each with `mock` and `sandbox` implementations,
chosen by env (`ADAPTER_MODE=mock|sandbox`). Default `mock`. Mock latencies: identity 600 ms, coverage 1.2 s,
meds 1 s, records 4–8 s. Sandbox is optional stretch: Sohar sandbox and Metriport sandbox only.
Verified and DoseSpot stay mocked.

## Demo scenarios (pick by phone number on screen 1)

| Phone | Scenario |
|---|---|
| (512) 555-0142 | Happy path: Jordan Reyes, Austin TX, BCBS TX PPO, $30 copay, records + meds found |
| (512) 555-0100 | Identity not matched → manual form |
| (512) 555-0111 | No coverage → self-pay $250 |
| (512) 555-0122 | Records slow → screens 4–5 ask directly |
| (415) 555-0133 | California address → stopped at screen 2 |

Add a collapsible **demo panel** (bottom-right, hidden behind a small button): current scenario,
each adapter's status and source name, and the live event log. This is how the walkthrough shows
"pulled, not typed".

## Screen details that matter

- **Screen 4:** send the free text to Claude with a fixed taxonomy (anxiety, depression, sleep, ADHD,
  trauma/PTSD, OCD, bipolar, substance use, eating, other) and return chips. No API key → keyword
  mapping fallback. Speech via the Web Speech API where supported. Never show a diagnosis label the
  patient didn't confirm.
- **Screen 6:** match Legion's current pattern: a ranked list (labels "Recommended", "Soonest available"),
  name, PMHNP, specialty tag, next opening. Selected provider expands: "Choose a day" strip with open
  counts, then "Available times" chips (Central time). Copay shown at the top. Continue names the slot.
- **Screen 7, agreements:** list Consent to treatment and telehealth, Medication history authorization,
  [Agreement 3 title: TBD], Controlled substance policy, Financial agreement. Each opens a full-text panel
  (placeholder text). An agreement is marked **read only when its end is scrolled into view**
  (IntersectionObserver on an end sentinel). Show "N of 5 read". Signature, tick and Book stay
  disabled until all 5 are read. Log `agreement_read` with a timestamp per document.
- **You're booked:** .ics download; show the reminder plan (text 24 h before, text with join link 1 h before).
  Mock the texts in the demo panel; no real SMS.

## Events

Log to an in-memory store, show them in the demo panel, and expose `/debug/funnel` with counts per step.
`onboarding_started`, `code_verified`, `identity_matched` / `verified_no_match`, `coverage_found` /
`coverage_not_found`, `screen_out` (reason), `safety_answered` (yes/no), `records_ready_at_screen_4`,
`manual_fallback` (field), `prefill_confirmed` / `prefill_edited`, `provider_selected`, `slot_selected`,
`agreement_read` (doc), `booked`, `reminder_scheduled`, `visit_joined`, `visit_completed`.
`/debug/funnel` must show start → booked and start → visit completed (the north star).

## Design

`docs/mockups/*.html` use a custom design-canvas runtime (`<x-dc>`, `{{ }}`); read them as markup and style
reference only, don't run them. Tokens:
- Ink `#0B0B0C`, secondary text `#55555C`, borders `#E4E4E7` / `#D4D4D8`, accent `#2B47D6`, success `#0F6B3A`, tint `#F7F8FC`.
- Fonts: Inter (UI), IBM Plex Mono (uppercase eyebrows and labels, letter-spacing .12em).
- Header: wordmark left, 7-segment progress + "N of 7" centre, Sign out right.
- Single centred column (640–920 px), H1 40 px / 500, pill primary button with arrow, "← Back" link.
- Selected states are solid black; cards have 16 px radius, 1 px border.
- Must work at phone width (stack columns, wrap rows). Accessible: real buttons and labels, focus states, 4.5:1 text contrast.

## How to work

1. Plan first: propose the file tree and build order, then wait for approval.
2. Build in this order: shell + design tokens → screens 1–3 → adapters + orchestration → screens 4–5 with
   fallbacks → screen 6 → screen 7 agreements → booked → visit room + visit completed → demo panel + events
   → README → deploy.
3. Add Playwright tests: the happy path through visit completed, one per fallback scenario, safety "Yes",
   and agreements (Book stays disabled until all 5 are read). Run them in GitHub Actions on the PR.
4. Commit in small steps on a feature branch (`feat/ai-native-onboarding`); open the PR, keep it open.
5. Before finishing, walk `DELIVERABLES.md` "Before you submit" and report anything not done.
