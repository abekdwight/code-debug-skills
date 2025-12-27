# @abekdwight/debug-server

Local debug log collector server (HTTP ingest + .logs) for hypothesis-driven investigation.

## Usage

Start in background and print JSON connection info:

```
npx @abekdwight/debug-server@latest start --json
```

Run in foreground:

```
npx @abekdwight/debug-server@latest run
```

Stop:

```
npx @abekdwight/debug-server@latest stop --json
```

Status:

```
npx @abekdwight/debug-server@latest status --json
```
