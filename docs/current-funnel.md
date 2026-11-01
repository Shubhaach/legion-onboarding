# Current funnel (baseline)

Source: Legion PostHog, aggregate, rolling 30 days ending Aug 29, 2026, `app.legionhealth.com` only.
Unit: ordered milestones within one browser session (sessions, not verified patients).

| # | Phase | Page or event | Sessions | From previous | From start | Lost |
|---|---|---|---|---|---|---|
| 1 | Start | /portal/join | 5,898 | 100.0% | 100.0% | — |
| 2 | Fit check | /portal/join/fit | 5,490 | 93.1% | 93.1% | 408 (6.9%) |
| 3 | Conditions | /portal/join/conditions | 3,578 | 65.2% | 60.7% | **1,912 (34.8%)** |
| 4 | Insurance | /portal/join/insurance | 3,338 | 93.3% | 56.6% | 240 (6.7%) |
| 5 | Needs | /portal/join/needs | 3,095 | 92.7% | 52.5% | 243 (7.3%) |
| 6 | Match page | /portal/join/match | 3,013 | 97.4% | 51.1% | 82 (2.6%) |
| 7 | Provider selected | `portal.provider_selected` | 1,909 | 63.4% | 32.4% | **1,104 (36.6%)** |
| 8 | Reservation created | `portal.provider.reservation.created` | 1,764 | 92.4% | 29.9% | 145 (7.6%) |
| 9 | Patient details | /portal/join/patient | 1,763 | 99.9% | 29.9% | 1 (0.1%) |
| 10 | Account created | `portal.onboarding.userCreated` | 1,403 | 79.6% | 23.8% | **360 (20.4%)** |
| 11 | Payment page | /portal/join/payment | 1,403 | 100.0% | 23.8% | 0 |

Notes from the brief: a reservation is not a completed appointment; payment-page reach is not a successful
payment (no payment-success event). Nothing is tracked after the payment page.

## Current flow, as walked (15 screens)

Email → email code → name and member ID → safety → hospitalization (past year) → conditions (16 chips) →
stimulant? → benzodiazepine? → opioid? → "why are you coming in" (free text) → health-profile records
consent → 5 consents (one signature) → provider matches → pick a time → confirm (card + photo ID, $250 self-pay shown).
