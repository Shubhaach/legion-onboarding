# PRD: AI-native patient onboarding

## TL;DR

Only 24% of sessions that start Legion's onboarding reach payment. We rebuild it so data is pulled, not typed: 15 screens become 7, and the patient types two things and confirms the rest, with a human check where it matters. North star: start → first visit completed. Primary: start → booked. Guardrail: booked → first visit completed.

## Customer problem

Getting from the first screen to a booked visit takes 15 screens, and every screen is a chance to leave: only 24% of sessions reach payment. Most screens ask the patient for a lot of information that the patient needs to manually enter. The few answers that truly need the patient (safety, reason for visit, consent) are buried among them. Three steps alone lose 3,376 of 5,898 sessions (30 days to Aug 29, 2026).

| Step | Sessions lost | Likely why |
| --- | --- | --- |
| Provider selection | 1,104 (36.6%) | Thin provider cards, price unseen, sparse slots |
| Conditions | 1,912 (34.8%) | Self-labelling from a diagnosis menu before any value is shown |
| Account creation | 360 (20.4%) | A password wall after 10 screens of effort |

Walking the flow shows the same pattern:

- **Asked for data Legion already has.** Three medication screens, despite consent to pull medication history. Photo ID asked twice.
- **Price comes last.** The $250 self-pay cost first appears on the final screen.
- **Asked twice.** Reason for visit as chips, then again as free text.

## Why it matters, and why now

Legion already pays to bring patients to the door, then loses three in four of them inside its own form.

- **Revenue without new spend.** At today's traffic, lifting start → payment from 24% to 30% is \~360 more patients a month reaching checkout.
- **The data layer is already paid for.** Metriport, Sohar and DoseSpot are live. Intake just doesn't use them.
- **The product contradicts the pitch.** Legion sells AI-native psychiatry. Rula books in \~3 minutes and Grow in \~10, both with cost shown first.
- **Why now:** low cost to change (front end plus orchestration of existing vendors), and the funnel is already instrumented to measure it.

## Goals and non-goals

**Goals**

1. **Pull, don't ask.** The patient types phone and date of birth; everything else arrives pre-filled to confirm.
2. **Fewer screens.** 15 down to 7.
3. **More bookings.** Lift start → booked.
4. **No bookings at the cost of show-ups.** First-visit completion holds or rises.

**Non-goals**

- Changing clinical screening or acuity rules
- New states beyond Texas and Utah
- Provider supply and scheduling policy
- No-show prediction or outreach calls

## User stories

As a patient, I want to:

1. "See my cost before I choose a provider, so checkout holds no surprise."
2. "Say what's going on in my own words, so I don't have to diagnose myself from a list."
3. "Pick a provider by fit and time, so I book someone I'll actually see."
4. "Follow a simple process to get myself treatment."

## Solution: pull, then confirm

On screen 1 the patient gives phone, date of birth and one consent. Verified, Sohar, Metriport and DoseSpot fill the rest in the background; the patient confirms or corrects the details that matter before moving on (human in the loop). Only what no system can know is asked: safety, the reason for the visit, and consent.&#32;

| # | Screen | Pulled from | Patient does |
| --- | --- | --- | --- |
| 1 | Get started | — | Phone, date of birth, one consent, text code |
| 2 | Is this you? | Verified: name, address, Texas check. Sohar: plan, copay | Confirm or edit |
| 3 | Safety check | — | Yes or No; Yes routes to crisis support |
| 4 | What's going on | Metriport: past diagnoses. AI summary of their words | Type or speak, confirm |
| 5 | Health snapshot | DoseSpot: medications, pharmacy. Metriport: hospital stays | "Still taking?" toggles, confirm |
| 6 | Provider and time | Schedules. Sohar: copay on each card | Pick a slot |
| 7 | Confirm and book | Verified ID reused; phone wallet | Sign plain-language consents, book |
| After | You're booked | — | Add to calendar; texts at 24 h and 1 h; one-tap join |

**When data is missing, the patient answers.** No second vendor is called: it adds cost, privacy exposure and conflicting data.

| Trigger | Fallback |
| --- | --- |
| Verified can't match | Manual name, address, insurance |
| Sohar finds no plan | Card photo, or self-pay with the price shown |
| Metriport not back by screen 4 or 5 | Ask those questions directly |
| Address outside Texas | Stop on screen 2 and say why |

**Build sequence**

1. **Prototype:** all 7 screens on sandbox and mock data.
2. **Phase 1:** Verified and Sohar on screens 1–2. Removes the account and insurance steps.
3. **Phase 2:** Metriport and DoseSpot pre-fill on screens 4–5, with fallbacks.
4. **Phase 3:** richer provider cards; post-booking reminders.

**Alternative considered: book first, intake later** (the Rula and Headway model). Patients pick a provider and time first, then complete intake before the visit. It shows value sooner, but we keep Legion's order: in psychiatry, safety screening must come before a booking, and matching on needs requires the intake first. Intake left until after booking also risks no-shows, which works against the north star.

## Success metrics

**Goal:** more Texas patients get from the first screen to a completed first visit, with less effort and minimal friction. Targets are proposals to confirm against baselines.

| Type | Metric | Today | Target |
| --- | --- | --- | --- |
| North star | Start → first visit completed | Not tracked | Up vs control |
| Primary | Start → booked | Not tracked; 23.8% reach payment | +6 pts |
| Secondary | Fields the patient types | Not tracked | 2 |
| Secondary | Median time to book | Not tracked | Under 5 min |
| Secondary | Pre-filled data confirmed without edits | — | 80%+ |
| Guardrail | Booked → first visit completed | Not tracked | No drop vs control |
| Guardrail | Safety screen answered | 100% | 100% |
| Guardrail | Manual fallback rate | — | Under 20% |

**New events:** `screen_out` (with reason), `verified_no_match`, `records_ready_at_screen_4`, `manual_fallback`, `booked`, `visit_joined`, `visit_completed`.

## Rollout

&#91;embedded content: rollout plan · 4 phases, 3 gates\]

Traffic grows only when a gate passes. The holdout runs longest because first visits land days after booking.

## Risks and open questions

| Risk | Mitigation |
| --- | --- |
| Phone, date of birth and record access on screen 1 feel intrusive | One plain-language reason; a "fill in myself" path |
| Cost on screen 2 raises early drop-off, especially for self-pay | Competitors show cost early, so we ship it. Lead with the insured copay; for self-pay, show what's included and HSA/FSA use. If drop-off rises with no gain in first visits completed, move cost back to the final screen. |
| Pulled data is wrong or stale | Every pulled field is shown and editable |
| Pulling HIE records before a treatment relationship exists | Consent on screen 1; confirm with Legion's counsel |
| Sohar was acquired by Zocdoc, a booking marketplace | Vendor review before Phase 1 |

**Open questions**

- What is today's booked → first-visit show rate?
- How much of the conditions-step loss is screen-out vs abandonment?
- Can consents be signed after booking but before the visit? That would cut screen 7 further.

Funnel data, vendor decisions and the competitor matrix: Appendix
