# debugsk

Debug investigation CLI (server + Codex skill management) for hypothesis-driven workflows.

## Usage

Start the local log server in background and print JSON connection info:

```
npx debugsk@latest server start --json
```

The server responds to CORS preflight (OPTIONS), so the default JSON snippet works across origins.

Stop:

```
npx debugsk@latest server stop --json
```

Status:

```
npx debugsk@latest server status --json
```

Codex skill install/update/remove:

```
npx debugsk@latest codex install
npx debugsk@latest codex update
npx debugsk@latest codex remove
```

Default install target is `./.codex/skills` (current directory). Use `-u` to install to `~/.codex/skills`.
If `./.codex` does not exist, debugsk will ask before creating it.
