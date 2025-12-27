# @debug/server

Local debug log collector server (HTTP ingest + .logs) for hypothesis-driven investigation.

## Usage

Start in background and print JSON connection info:

```
npx @debug/server@latest start --json
```

Run in foreground:

```
npx @debug/server@latest run
```

Stop:

```
npx @debug/server@latest stop --json
```

Status:

```
npx @debug/server@latest status --json
```
