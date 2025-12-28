# Logging Schema (Minimal Standard)

Use this schema when instrumenting. Keep fields small, structured, and correlated.

## Required fields
- `timestamp`: ms epoch or ISO-8601 string
- `message`: short, human-readable message
- `sessionId`: investigation session identifier
- `runId`: single reproduction run identifier
- `hypothesisId`: hypothesis identifier (e.g. "H1")

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
