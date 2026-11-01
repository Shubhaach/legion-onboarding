# AI interaction history

The brief requires the **complete, unedited** history of every AI interaction used for this assignment:
every prompt, response, follow-up, retry and correction, across all tools and threads.
No selected excerpts and no reconstructed summaries.

## What goes here

| File | Thread | Tool |
|---|---|---|
| `01-planning-chat.*` | Research, journey mapping, PRD, design (this planning thread) | Claude (claude.ai) |
| `02-claude-code-*.*` | Every Claude Code session, one file each | Claude Code |
| `03-*.*` | Any other AI tool used | — |

Export each thread in full from its tool, in its native format (plus a readable copy if the native one is JSON).

## Redaction rules

Redact **only** credentials, secrets (API keys, tokens) and personal information unrelated to the assignment.
Replace with a labelled marker and log it below. Never include real patient information.

Marker format: `[REDACTED: <type> – <reason>]`, e.g. `[REDACTED: API key – credential]`.

## Redaction log

| File | Location | What was redacted | Reason |
|---|---|---|---|
| `02-claude-code-01-build.jsonl` | 3 occurrences (session context attached by Claude Code) | Founder's email address → `[REDACTED: email]` | Unrelated personal information |
| `02-claude-code-01-build.jsonl` | 2 occurrences (`npx vercel login` output) | One-time Vercel device login code → `[REDACTED: Vercel device code]` | Credential (already used and expired) |
| `02-claude-code-01-build.jsonl` | 2 occurrences (`gh auth status` output) | GitHub token, already shown masked by the gh CLI → `[REDACTED: GitHub token (already masked by gh CLI)]` | Credential |
