## What this is

AI-native rebuild of Legion Health's Texas patient onboarding: 15 screens → 7, data pulled and confirmed,
through first visit completed.

- Prototype: <!-- deployed URL -->
- Walkthrough video: <!-- link -->
- PRD: `docs/PRD.md`

## How it works

<!-- One paragraph: pull, then confirm; parallel lookups on screen 1; fallbacks ask the patient. -->

## Key decisions and trade-offs

<!-- Top 5 from docs/decisions.md -->

## Demo scenarios

| Phone | Scenario |
|---|---|
| (512) 555-0142 | Happy path |
| (512) 555-0100 | Identity not matched → manual form |
| (512) 555-0111 | No coverage → self-pay |
| (512) 555-0122 | Records slow → asked directly |
| (415) 555-0133 | Out of state → stopped |

## Testing

<!-- Playwright results; how to run locally -->

## What's mocked vs real

<!-- From docs/data-sources.md -->

## AI interaction history

Complete and unedited in `docs/ai-history/`. Redactions are labelled and logged.
