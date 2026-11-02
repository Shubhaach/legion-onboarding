# Key decisions and trade-offs

Use these in the PR description and the walkthrough.

| Decision | Chose | Rejected | Why | Trade-off we accept |
|---|---|---|---|---|
| Core model | **Pull, then confirm** (human in the loop) | Ask everything | Patient types 2 things; confirms the rest; only safety, reason and consent are asked | Depends on vendor coverage; needs fallbacks |
| Screen count | **7 screens** + confirmation | 5 (one AI chat for intake) | Clinical answers stay scannable and measurable per step | Two more screens |
| Order | **Safety and intake before booking** (Legion's order) | Book first, intake later (Rula, Headway) | Safety screening must precede booking in psychiatry; matching needs intake | Value (a provider) appears later |
| Identity | **Verified only** | Verified + Persona | Cost, privacy exposure, conflicting data | Some patients answer manual questions |
| Cost source | **Sohar only**, shown on screen 2 | Verified's eligibility as well; cost at the end | One source of truth; competitors show cost early | Possible early drop-off; if it rises with no gain in first visits, move cost back to the end |
| Missing data | **Ask the patient** | Call a second vendor | Same as identity | Slightly longer path for some |
| Records latency | **Never block on Metriport**; ask if not back by screen 4–5 | Wait for records | Speed matters more than completeness at intake | Clinician may get fewer records up front |
| Provider screen | **Legion's ranked list**, selected one expands to day then time | New card grid | Familiar, clean; one screen instead of two | Less browsing of many providers at once |
| Agreements | **Each must be opened and scrolled to the end** before signing | One summary + tick | Informed consent; auditable `agreement_read` events | Adds reading time on screen 7 |
| Vendor names | **Hidden from patients**; shown in demo panel | Source tags in UI | Patients don't need vendor names | Walkthrough must use the demo panel |
| Finish line | **North star: first visit completed**; primary: start → booked; guardrail: booked → visit | Booked as the end | The brief defines onboarding through the first visit | Visit completion lags booking by days |

## Build decisions (made while building the prototype)

Decided during the build, per the founder's instruction to decide and log rather than stop and ask.

| Decision | Chose | Rejected | Why | Trade-off we accept |
|---|---|---|---|---|
| Session storage | **Signed cookies** (session + event log, HMAC-SHA256) | In-memory store keyed by cookie (CLAUDE.md) | Vercel runs many instances and freezes work after a response; in-memory sessions would be lost or split | ~4 KB cookie limit, so the event log keeps the last 60 events |
| Lookup timing | **Status derived from time since screen 1** (fixture latencies) | Background promises | Same answer on every instance, no background work; the parallel-lookup behaviour is the same for the patient | Mock-only; real vendors would run in parallel for real |
| Request ordering | **All session requests go through one client queue** | Fire-and-forget polling | Found on the live URL: a slow poll could land after an action and bounce the patient back to /start | Polls wait for actions; two open tabs could still race (demo only) |
| Funnel counts | **In memory per instance; counted per person** (phone + DOB hash) | Shared database | CLAUDE.md says no database; per person fixes the sessions-vs-patients gap the brief names | `/debug/funnel` resets on deploy and can differ between instances |
| Unknown phone numbers | **Behave like "identity not matched"** | Fixture default (happy path) | A stranger's number must never show Jordan's details | Reviewers must use the demo numbers (one click in the demo panel) |
| Identity match | **Needs phone and date of birth** | Phone only | Any doubt becomes a question for the patient | A typo in the DOB sends the patient to the manual form |
| Consent unticked | **Nothing is pulled; screen 2 is the manual form** | Block until ticked | Respects the patient's choice without a dead end | Longer path for that patient |
| "Fill in myself" | **Link on screen 2 opens the same manual form** | Separate screen | Founder's answer; PRD risk mitigation | — |
| Served states | **Texas and Utah** (from fixtures) | Texas only | Fixtures and PRD non-goals name both | California etc. are stopped on screen 2 with a kind message and findtreatment.gov |
| Out-of-state | **"My address is wrong" link reopens the form** | Hard stop only | Pulled addresses can be stale | — |
| Stimulant on file (555-0155) | **Shown to the patient on screen 5 with a neutral note; flagged in the clinician view on /visit** | Extra screening questions or a block | Never block the patient; the prescriber checks the Texas PMP | The flag lives in a demo toggle, not a separate clinician app |
| Wrong code | **`000000` is rejected** (`code_failed`) | Any code works | Shows the error state | — |
| Crisis screen | **988 call/text, 911, Crisis Text Line (HOME to 741741); flow stops; `screen_out(safety)`** | — | Founder's answer | — |
| Crisis words on screen 4 | **Show crisis resources if the free text mentions self-harm** | Ignore after screen 3 | Never soften safety | Keyword list is simple |
| Screen 4 AI | **Claude Opus 5.5, low effort, structured output limited to the fixed taxonomy; 8 s timeout** | Free-form labels | Can only return known ids; no diagnosis labels | Without a key, or on any error/refusal, keyword mapping is used (logged as the source in the demo panel) |
| Agreement 3 | **Placeholder title, visibly marked "confirm with Legion"** | Inventing a title | Founder's answer | — |
| Payment | **Mock card form on screen 7; only 4242 4242 4242 4242; nothing charged; `payment_authorized`** | Wallet / real processor | Founder's answer; closes the brief's "no payment-success event" gap | — |
| Card photo upload | **File picker only; the photo stays on the device** | Upload + OCR | Out of scope for the prototype | Coverage shows "confirmed before your visit" |
| Provider ranking | **Specialty fit with confirmed concerns and record items, then earliest slot; "Recommended" ×2 and "Soonest available"** | Opaque score | Explainable; matches Legion's labels | Simple heuristic |
| Visit room | **Mock video; join opens 10 min before, demo panel can fast-forward** | Real video | Prototype | — |
| Reschedule link on You're booked | **Left out** | Rebuild booking for reschedule | Not needed to reach the finish line | Mockup shows it |
| Follow-up | **Two one-tap options, same provider, ~4 weeks out** | Full scheduler | Shows the post-visit path | — |
| Extra events | `code_failed`, `concerns_submitted`, `snapshot_confirmed`, `controlled_med_flagged`, `payment_authorized`, `followup_booked` | — | Every screen needs a completion event for the funnel | — |
| Sandbox adapters | **Stubs that return `error`** | Real Sohar/Metriport sandbox calls | Optional stretch; mocks cover every scenario | `ADAPTER_MODE=sandbox` is not useful yet |
