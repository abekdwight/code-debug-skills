# Logging Schema (Minimal Standard)

Use this schema when instrumenting. Keep fields small, structured, and correlated.

**IMPORTANT: You MUST ALWAYS include all required fields when logging. Never omit any of them.**

## Required fields (MUST ALWAYS be specified)
- `timestamp`: ms epoch or ISO-8601 string — **ALWAYS include this**
- `message`: short, human-readable message — **ALWAYS include this**
- `sessionId`: investigation session identifier — **ALWAYS include this**
- `runId`: single reproduction run identifier — **ALWAYS include this**
- `hypothesisId`: hypothesis identifier (e.g. "H1") — **ALWAYS include this**

## Recommended fields
- `location`: file:line or function name
- `level`: debug/info/warn/error
- `data`: arbitrary JSON payload
- `traceId` / `requestId` / `spanId`: use existing correlation IDs when available

## Example event
```json
{
  "timestamp": 1730000000000,
  "sessionId": "debug-session",
  "runId": "run1",
  "hypothesisId": "H1",
  "location": "path/to/file.ts:79",
  "message": "enter: createSession()",
  "data": { "userId": "...", "provider": "..." }
}
```

## Storage layout (recommended)
```
.logs/
  runtime.json
  server.pid
  {sessionId}-{runId}.jsonl
```
