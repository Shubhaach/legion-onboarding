# Legion Health: AI-native onboarding (Texas)

A working prototype of Legion Health's patient onboarding, rebuilt so data is **pulled, then confirmed**. The patient types a phone number and date of birth. Identity, insurance, copay, past records and medications are fetched in parallel and shown for the patient to confirm. Only what no system can know is asked: the safety question, what's going on in their own words, and consent. 15 screens become 7, and the flow runs past booking through **first visit completed**, which is where the brief says onboarding ends.

- **Live prototype:** https://legion-onboarding-theta.vercel.app (synthetic data only)
- **Walkthrough video (~5 min):** _link to be added_
- **PRD:** [`docs/PRD.md`](docs/PRD.md) · **Decisions and trade-offs:** [`docs/decisions.md`](docs/decisions.md) · **Data sources and what each adds:** [`docs/data-sources.md`](docs/data-sources.md) · **Baseline funnel:** [`docs/current-funnel.md`](docs/current-funnel.md) · **Brief:** [`docs/brief.md`](docs/brief.md)
- **AI interaction history:** [`docs/ai-history/`](docs/ai-history/). Redaction rules and the redaction log are in [`docs/ai-history/README.md`](docs/ai-history/README.md).

## Try it in 2 minutes

1. Open the live URL. Click **Demo** (bottom right) and pick a scenario; it fills screen 1 for you.
2. Any 6-digit code works (`000000` simulates a wrong code).
3. Keep the demo panel open to watch each source arrive ("pulled, not typed"), the mock text messages and the live event log.
4. After booking, use **Fast-forward to visit time** in the demo panel, join the mock visit, then end it.
5. See the funnel at [`/debug/funnel`](https://legion-onboarding-theta.vercel.app/debug/funnel) (north star: start → first visit completed).

| Phone | Date of birth | Scenario | What to look for |
|---|---|---|---|
| (512) 555-0142 | 03/14/1992 | Happy path: Jordan Reyes, Austin, BCBS TX PPO | Everything pre-filled; $30 copay on screen 2; records card on screen 4; meds on screen 5 |
| (512) 555-0100 | any | Identity not matched | Screen 2 becomes the manual form |
| (512) 555-0111 | 11/02/1988 | No coverage: Taylor Brooks | Self-pay $250 shown on screen 2, or card photo |
| (512) 555-0122 | 07/21/1996 | Records slow: Morgan Lee | Screens 4 and 5 ask directly (concern chips; "Any hospital stays in the past year?") |
| (415) 555-0133 | 01/30/1990 | Out of state: Casey Kim, CA | Stopped on screen 2 with a kind message; nothing booked |
| (512) 555-0155 | 05/09/1999 | Stimulant on file: Riley Chen | Shown on screen 5; flagged in the provider view on `/visit`; never blocked |

Answering **Yes** on the safety check (screen 3) always goes to the crisis screen (988, 911, Crisis Text Line) and stops the flow, in every scenario. A wrong date of birth or an unknown number is treated as "not matched": the patient is asked, and no second vendor is called.

## The flow

| Route | Screen | Pulled from (demo panel only) | Patient does |
|---|---|---|---|
| `/start` | 1 Get started | none | Phone, date of birth, one consent, text code |
| `/confirm` | 2 Is this you? | Verified (identity), Sohar (plan, copay) | Confirm, "Something's wrong", or fill in themselves |
| `/safety` | 3 Safety check | none | Yes → `/crisis`, flow stops |
| `/concerns` | 4 What's going on | Metriport (past diagnoses); Claude maps their words to concern chips | Type or speak; confirm record items |
| `/snapshot` | 5 Health snapshot | DoseSpot (meds, pharmacy), Metriport (hospital stays) | "Still taking?" toggles; confirm |
| `/provider` | 6 Provider and time | Mock schedules; copay | Ranked list; selected provider expands to days, then times |
| `/book` | 7 Review and book | Identity reused | Read all 5 agreements to the end, test card, sign, book |
| `/booked` | You're booked | none | .ics download, reminder plan, camera and mic test |
| `/visit` | Visit room (mock) | none | Join, mock video, end visit |
| `/visit-complete` | First visit completed | none | Next steps, follow-up booking, pharmacy on file |

## What's mocked vs real

| Piece | In this prototype |
|---|---|
| Verified (identity) | **Mocked** from `data/fixtures/patients.json` (600 ms) |
| Sohar (coverage, copay) | **Mocked** from `coverage.json` (1.2–1.5 s). Sandbox adapter is a stub |
| Metriport (records) | **Mocked** from `records.json` (4–5 s; "records slow" never arrives). Sandbox adapter is a stub |
| DoseSpot (meds, pharmacy) | **Mocked** from `medications.json` (1 s) |
| Claude (screen 4 concerns) | **Real** when `ANTHROPIC_API_KEY` is set (Claude Opus 5.5, structured output limited to the fixed list). Otherwise keyword mapping. The demo panel shows which one ran |
| Text code, SMS reminders | **Mocked.** Any code works; texts appear in the demo panel, none are sent |
| Payment | **Mocked.** Test card 4242 4242 4242 4242 only; nothing is charged |
| Video visit | **Mocked** room with a provider placeholder |
| Speech input | **Real** Web Speech API where the browser supports it |
| Session | Signed cookies (no database). See `docs/decisions.md` |

All data is synthetic. Phone numbers use the fictional 555-01xx range; no real patients, providers, member IDs or addresses.

## Run locally

```bash
npm install
cp .env.example .env.local   # optional: add ANTHROPIC_API_KEY; set SESSION_SECRET
npm run dev                  # http://localhost:3000
```

## Tests

Playwright covers the happy path through visit completed, every fallback scenario, the stimulant flag, safety "Yes", the agreements gate (Book stays disabled until all 5 are read to the end) and the wrong code. The happy path, out-of-state and safety tests also run at phone width. CI runs lint and the suite on every PR (`.github/workflows/e2e.yml`).

```bash
npm test                                                     # builds and starts the app on :3100
BASE_URL=https://legion-onboarding-theta.vercel.app npm test # same suite against the live URL
```

## Events and Legion's current instrumentation

Events are logged per session, shown in the demo panel, and counted **per person** on `/debug/funnel` (the brief notes today's counts are browser sessions). Each maps to the nearest event Legion fires today, so a before/after comparison is possible:

| Ours | Nearest Legion event today |
|---|---|
| `onboarding_started` | `portal.onboarding.started` |
| `coverage_found` / `coverage_not_found` | `portal.onboarding.insurance_selected` |
| `concerns_submitted` | `portal.onboarding.conditions` |
| `snapshot_confirmed` | `portal.onboarding.needs` |
| `provider_selected` | `portal.provider_selected` |
| `slot_selected` | `portal.provider.reservation.created` |
| `payment_authorized`, `booked` | none (the brief notes no payment-success event) |
| `visit_joined`, `visit_completed` | none (not tracked today) |
| `code_verified`, `identity_matched`, `verified_no_match`, `prefill_confirmed`, `prefill_edited`, `manual_fallback`, `screen_out`, `safety_answered`, `records_ready_at_screen_4`, `agreement_read`, `reminder_scheduled`, `controlled_med_flagged`, `followup_booked`, `code_failed` | new |

## How AI was used

AI (Claude for planning, Claude Code for the build) did the research, the drafting and most of the code. The human set direction, checked the output and corrected it. The complete, unedited history is in `docs/ai-history/`. Some moments worth reading:

- **Missing context caught before building.** The first brief link pointed to the PRD rather than the brief, and one paste arrived as `[Cmd+V]`. The agent stopped and asked instead of building from sections 1–3 alone.
- **Plan reviewed before code.** The agent proposed the file tree and flagged that an in-memory session store breaks on Vercel. The human approved signed cookies and answered six open product questions before any code was written.
- **Testing against the live URL found a real bug.** A race between polling and actions showed up only at production latency. It was fixed by queueing all session requests, and the test suite now runs against the live URL too.
- **Decisions are logged.** Every choice made without asking is in the "Build decisions" table in `docs/decisions.md`.

## Project layout

```
app/                 screens (one folder per route), api/ (session, action, concerns, ics), debug/funnel
components/          header, demo panel, manual form, insurance choice, agreement panel, flow state
lib/                 session (signed cookies), adapters/ (identity, coverage, records, meds), state (actions + events),
                     flow (screen order), providers (ranking), concerns (+ Claude), time (Central time), funnel
data/fixtures/       synthetic scenarios, patients, coverage, records, meds, providers, agreements, reminders
docs/                brief, PRD, decisions, data sources, funnel baseline, walkthrough script, mockups, AI history
tests/e2e/           Playwright
```
