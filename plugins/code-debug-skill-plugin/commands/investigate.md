---
argument-hint: [environment] [short summary]
description: Run the standardized bug investigation workflow (facts → hypotheses → instrumentation → reproduction → narrowing → fix).
---
Use the `debug-investigator` subagent to investigate the issue.

Environment: $1
Summary: $2

Rules:
- Do not assume any specific infrastructure.
- Prefer instrumentation and decisive signals.
- If you add logs, instruct the user exactly how to reproduce and where to find the `.logs/` outputs.
