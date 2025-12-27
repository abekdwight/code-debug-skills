---
name: code-debug-skill
description: Standardized, hypothesis-driven debug investigation workflow for unexpected behavior, regressions, incidents, flaky tests, or production issues. Use to plan instrumentation, reproduce with decisive signals, compare runs, and narrow root cause without assuming any vendor or infrastructure.
---

# Bug Investigation Skill

## Operating principles
- Separate facts (observed) from hypotheses (inferred).
- Maintain multiple competing hypotheses until evidence eliminates them.
- For each hypothesis, define predictions, falsifiers, and required instrumentation.
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
4. Instrument to validate hypotheses:
   - Add logs/metrics at decision points and boundaries.
   - Include correlation keys (sessionId/runId/hypothesisId + requestId/traceId if available).
5. Execute controlled reproduction:
   - Provide a short checklist and exact steps.
   - Capture logs for the run.
6. Analyze logs and narrow:
   - Compare successful vs failing runs.
   - Prefer binary search-style narrowing when possible.
7. Iterate until root cause is confirmed.

## Instrumentation policy
- Prefer a local HTTP ingest logger when available; otherwise integrate with existing logging.
- Logs must never throw, avoid secrets/PII, and be easy to remove.
- Record location, message, timestamp, and correlation fields in every event.
- When proposing code changes, also propose removal/disable strategy.

## User interaction rules
- When reproduction is required, provide exact steps, expected signals, and required artifacts.
- If reproduction is not possible, pivot to existing logs, metrics, traces, config diffs, or safe probes.

## Reporting format
Use the template in `assets/report-template.md`.

## References
- Use `references/logging-schema.md` when adding or validating instrumentation.
- Use `references/hypothesis-template.md` to structure hypotheses and predictions.
