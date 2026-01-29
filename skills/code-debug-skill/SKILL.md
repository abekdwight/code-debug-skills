---
name: code-debug-skill
description: Standardized, hypothesis-driven debug investigation workflow for unexpected behavior, regressions, incidents, flaky tests, or production issues. Use to plan instrumentation, reproduce with decisive signals, compare runs, and narrow root cause without assuming any vendor or infrastructure.
---

# Bug Investigation Skill

## Investigation mindset (how to think)
- Treat facts as primary. Separate observations from inferences at all times.
- Keep multiple competing hypotheses and rank them by likelihood and impact.
- For each hypothesis, define:
  - prediction (what must be observed if true),
  - falsifier (what would disprove it),
  - required instrumentation (what to measure or log).
- Prefer decisive signals over narratives. Do not ask for reproduction without a plan to capture evidence.
- Narrow with comparisons (fail vs pass) and a binary-search style approach when possible.
- Add debug instrumentation generously to capture decisive signals in a single reproduction run.
  - Assume each reproduction is costly; instrument enough to narrow root cause without requiring additional runs.
- Never fix code speculatively. Confirm root cause with evidence before any production code change.

## Tool selection (what to use)
- Primary tool for new instrumentation: local HTTP ingest logger (`debugsk`).
  - **AI MUST start the server** via `npx debugsk@latest server start --json` before instrumentation.
  - Use the JSON output to copy the snippet and endpoint.
  - The server accepts CORS preflight (OPTIONS), so the default JSON snippet works across origins.
- **AI MUST auto-generate** sessionId/runId and embed them directly into instrumentation code.
  - Do NOT ask the user to set these via console.
- If reproduction is possible, prioritize logs/metrics that directly test predictions.
- If reproduction is not possible, pivot to existing signals:
  - logs/metrics/traces, config diffs, data snapshots, dumps, and deterministic probes.
- If native signals do not answer the question, prefer `debugsk` for new observations.
  - This avoids contaminating native logging and keeps investigation logs isolated.
- Use native logs as reference in addition to new instrumentation.

## Operating principles
- Separate facts (observed) from hypotheses (inferred).
- Maintain multiple competing hypotheses until evidence eliminates them.
- For each hypothesis, define predictions, falsifiers, and required instrumentation.
- **AI performs all automatable tasks:** server start, ID generation, log collection, analysis.
- **User performs ONLY non-automatable UI actions** (clicks, form inputs, etc.).
- Do not ask for reproduction until an instrumentation plan is ready.

## Core loop
1. Clarify the bug precisely:
   - Environment (local/staging/production), version/commit, frequency, impact.
   - Minimal reproduction steps, expected vs actual, errors and timestamps.
2. Identify candidate code paths:
   - Search by endpoint/route/feature/config key/error text.
   - Map request → handler → data/dependencies.
3. Generate at least three hypotheses:
   - Client/input, server logic, data/state, concurrency, config, dependency, resource.
4. Start debug server and generate IDs:
   - Run `npx debugsk@latest server start --json` to get endpoint.
   - Auto-generate sessionId/runId and embed in instrumentation code.
5. Instrument to validate hypotheses:
   - Add logs/metrics at decision points and boundaries.
   - Include auto-generated correlation keys (no user action required).
6. Execute controlled reproduction:
   - **AI starts servers if needed.**
   - Provide ONLY UI steps to the user (click, drag, submit, etc.).
   - NO console commands, NO file operations.
7. Collect and analyze logs:
   - **AI reads log files directly** using Read/Grep tools.
   - Compare successful vs failing runs.
   - Prefer binary search-style narrowing when possible.
8. Iterate until root cause is confirmed.

## Instrumentation policy
- Prefer a local HTTP ingest logger when available; otherwise integrate with existing logging.
- If native signals are insufficient, prioritize `debugsk` over adding more native logs.
- Use native logs as reference alongside the added instrumentation.
- Logs must never throw, avoid secrets/PII, and be easy to remove.
- Record location, message, timestamp, and correlation fields in every event.
- **YOU MUST ALWAYS include all log fields (timestamp, message, sessionId, runId, hypothesisId, location) in every log event. Never omit any field.**
- Do not guard instrumentation behind environment flags. Write logs for the investigation, then remove them after completion.
- **AI starts the debug server, generates IDs, inserts instrumentation, and collects/analyzes logs.**
- **User performs ONLY UI actions** (clicks, form inputs, etc.). NO console commands, NO file operations.

## User interaction rules
- **MINIMIZE user burden.** AI performs all automatable tasks:
  - Start/stop debug server
  - Generate and embed sessionId/runId
  - Read and analyze log files
  - Determine if tunneling is needed (inspect environment, don't ask)
- **User performs ONLY non-automatable UI actions:**
  - Click buttons, drag elements, fill forms
  - Navigate screens
  - Observe visible behavior
- When reproduction is required, provide ONLY UI steps. NO console commands, NO file operations.
- If reproduction is not possible, pivot to existing logs, metrics, traces, config diffs, or safe probes.
- For external/mobile access, AI determines tunneling need based on environment inspection:
  - If remote/staging: check existing tunnels or propose specific setup
  - Do NOT ask open-ended "should we use tunnel?" questions

## Cleanup policy
- When the user confirms the issue is resolved or the investigation is closed, stop the debug server and delete all investigation logs (e.g., `.logs/`).
- Do not use `git checkout`, `git clean`, or other bulk git cleanup for log deletion. Remove files explicitly and safely.
- If deletion could affect unrelated files, confirm the exact paths before removal.

## Reporting format
Use the template in `assets/report-template.md`. Headings are bilingual (English / Japanese); write content in the user's language.

## References
- Use `references/logging-schema.md` when adding or validating instrumentation.
- Use `references/hypothesis-template.md` to structure hypotheses and predictions.
