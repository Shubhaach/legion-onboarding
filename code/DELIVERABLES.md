# Deliverables checklist

From the take-home brief, section 1 ("Goal"). Tick each before submitting.

| # | Deliverable | What "done" means | Where |
|---|---|---|---|
| 1 | **Working prototype, deployed** | Public URL; happy path and every fallback scenario run end to end, through **first visit completed** | Vercel URL in `README.md` |
| 2 | **Repository** | Clean history, README a reviewer can follow in 2 minutes, `.env.example`, tests pass | GitHub |
| 3 | **Open pull request** | PR stays **open**, not merged. Description uses `.github/pull_request_template.md` | GitHub |
| 4 | **Recorded walkthrough, about 5 minutes** | The most important decisions and trade-offs, shown in the live prototype | Link in `README.md` and the PR. Script: `../docs/walkthrough/script.md` |
| 5 | **Complete AI interaction history** | Every prompt, response, follow-up, retry and correction, across all tools and threads. Unedited. Only credentials, secrets or unrelated personal information redacted, each redaction labelled | `../docs/ai-history/` (see its README) |
| 6 | **No real patient information** | Synthetic data only, everywhere: code, fixtures, screenshots, video, history | Whole repo |

## Definition of onboarding

Onboarding ends when the patient's **first visit is completed**, not when it is booked or scheduled.
The prototype therefore includes the booked screen, the visit room and the visit-completed screen.

## Supporting material (also submitted)

- PRD: `../docs/PRD.md` (live doc in Claude Docs)
- Design canvas: mobile options and the final web flow (Claude Design canvas; screenshots go in `../docs/mockups/`)
- Decisions and trade-offs: `../docs/decisions.md`
- Data sources and what each adds: `../docs/data-sources.md` (the brief asks for this)
- Baseline funnel: `../docs/current-funnel.md`

## Before you submit

- [ ] Paste the full brief into `../docs/brief.md` and re-check it for requirements beyond section 3
- [ ] Prototype URL works in a private window, on desktop and phone
- [ ] All Playwright tests pass in CI
- [ ] PR is open, description complete, video linked
- [ ] AI history complete: this planning chat, every Claude Code session, any other tool used
- [ ] Redaction log filled in; no secrets anywhere in the repo or history
