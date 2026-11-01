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
