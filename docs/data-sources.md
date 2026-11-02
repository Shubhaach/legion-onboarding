# Data sources: what we use, what each adds

| Source | Status | Used for | Screens | Prototype |
|---|---|---|---|---|
| **Verified** (1-Click Signup) | Available, not live | Phone + date of birth → name, address (Texas check), account; finds the insurer | 1–2 | Mocked |
| **Sohar Health** | Live | Insurance discovery, eligibility and benefits, network status, copay. **Only cost source shown to the patient** | 2, 6, 7 | Mock; Sohar sandbox optional |
| **Metriport** | Live | HIE records: past diagnoses, hospital stays. Async; fallback to asking if not back in time | 4–5 | Mock; Metriport sandbox optional |
| **DoseSpot** | Live | Medication fill history and pharmacy | 5 | Mocked |
| **Claude (Anthropic API)** | Added | Turns the patient's own words into concern chips (fixed taxonomy). Not a data source; an AI layer | 4 | Live if key set; keyword fallback |

## Decisions

- **Identity: Verified only, not Persona.** Running both would add cost, privacy exposure and conflicting
  data. When Verified can't match or something is unclear, **the patient answers a question** instead.
- **Insurance: Verified finds the insurer; Sohar verifies it.** Sohar is live and built for behavioural-health
  plan carve-outs, so it is the single source of truth for coverage and cost.

## Additional sources considered, not added

| Source | What it would add | Why not now |
|---|---|---|
| Particle, Health Gorilla, Zus | Same HIE records job as Metriport | Metriport already live |
| Flexpa, b.well | Patient-linked claims (past admissions, deductible to date) | Overlaps Sohar, Metriport and DoseSpot; patient must log into their health-plan portal, which adds friction |
| Surescripts, DrFirst | Medication history | DoseSpot already provides it |
| Bamboo (PDMP) | Controlled-substance history | A prescriber check at prescribing time, not a patient intake step |
| Persona | Document + selfie identity check | See decision above |
| Lab results (e.g. Quest, Labcorp via HIE or direct) | Recent labs a prescriber needs (thyroid, metabolic panel, lithium levels, pregnancy tests) | Useful after the first visit for medication management, not at intake; Metriport already returns some lab results |
| Provider directories (NPPES NPI registry, state licensing boards, CAQH) | Verified provider credentials and Texas licence status; NPI on referrals | Legion already credentials its own providers; patients don't see this. Worth adding to verify outside referrals |
| Wearable and patient-generated data (Apple Health, Google Health Connect, Oura, Fitbit) | Sleep, activity and heart-rate trends; between-visit symptom check-ins (PHQ-9, GAD-7) | Adds friction (account linking) and needs clinical interpretation; better as an opt-in after the first visit to support measurement-based care |
