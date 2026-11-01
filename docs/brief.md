# Take-home brief

> TODO (founder): paste the **full** Notion brief here, every section. Only sections 1–3 were used during
> planning; any later section (evaluation criteria, constraints, time limits) must be checked against the build.

## What we know (sections 1–3)

**1. Goal.** Go through Legion's current onboarding as a prospective patient in Texas. Rebuild patient
onboarding in an AI-native world. Onboarding ends when the patient's first visit is completed, not when it
is booked or scheduled. Build and deploy the version you believe should exist. Submit the working prototype,
the repository and open pull request, and a ~5 minute recorded walkthrough of the most important decisions
and trade-offs. Submit the complete, unedited AI interaction history (redact only credentials, secrets or
unrelated personal information, and label every redaction). Do not include real patient information.

**2. Current onboarding data.** Aggregate PostHog telemetry, 30 days ending Aug 29, 2026, production host
only, counted in browser sessions. Covers the web flow through payment-page reach; no first-visit-completed
milestone. See `current-funnel.md`.

**3. Data sources and integrations.** Live today: Metriport (HIE records), Sohar Health (eligibility,
benefits, insurance discovery), DoseSpot (e-prescribing, medication workflow). Available, not live:
Verified (1-Click Signup and 1-Click Health: demographic autofill, insurance discovery, eligibility),
Persona (identity verification). Any subset may be used; other sources may be added. **Briefly explain what
each additional source adds** (answered in `data-sources.md`).
