# Test data

All data here is **synthetic**. No real patients, providers, member IDs or addresses.
Phone numbers use the reserved fictional 555-01xx range.

| File | Feeds | Mocks |
|---|---|---|
| `scenarios.json` | Which scenario a phone number triggers, latencies, outcomes | Orchestration |
| `patients.json` | Name, date of birth, address; served states | Verified |
| `coverage.json` | Plan, member ID, network, copay; self-pay price | Sohar |
| `records.json` | Past diagnoses, hospital stays | Metriport |
| `medications.json` | Fills (relative dates), controlled flag, pharmacy | DoseSpot |
| `providers.json` | Providers, specialties, slots (relative days, Central time) | Scheduling |
| `concerns.json` | Screen 4 taxonomy, keyword fallback, test examples | AI layer |
| `agreements.json` | Screen 7 agreement titles and placeholder text | Legal docs |
| `reminders.json` | Booking and reminder texts | SMS |

## Scenarios

| Phone | Scenario | What to check |
|---|---|---|
| (512) 555-0142 | Happy path: Jordan Reyes | Everything pre-filled; $30 copay; records and meds ready by screen 4 |
| (512) 555-0100 | Identity not matched | Screen 2 becomes a manual form; `verified_no_match` logged |
| (512) 555-0111 | No coverage: Taylor Brooks | Self-pay $250 shown on screen 2; card-photo option |
| (512) 555-0122 | Records slow: Morgan Lee | Screens 4–5 ask directly; `records_ready_at_screen_4` = false |
| (415) 555-0133 | Out of state: Casey Kim, CA | Stopped on screen 2 with a clear message; `screen_out` (state) |
| (512) 555-0155 | Stimulant on file: Riley Chen | Screen 5 shows the stimulant; flagged for clinician; carve-out plan (Optum) |

Screen 1 code: any 6 digits works; `000000` simulates a wrong code.
Safety: answering "Yes" on screen 3 always routes to the crisis screen, in every scenario.
