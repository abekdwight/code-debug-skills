# debugsk

Debug investigation CLI (server + skill management for Claude Code and Codex) for hypothesis-driven workflows.

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

## Claude Code Skill

Install the skill directly to `~/.claude/skills/`:

```
npx debugsk@latest claude install -u
npx debugsk@latest claude update -u
npx debugsk@latest claude remove -u
```

Default install target is `./.claude/skills` (current directory). Use `-u` to install to `~/.claude/skills`.

> **Warning**: Skills installed via npx take priority over plugin-installed skills. If you have both the plugin and a npx-installed skill, the npx-installed version will be used. To revert to the plugin version, run `npx debugsk@latest claude remove`.

## Codex Skill

Install the skill to `~/.codex/skills/`:

```
npx debugsk@latest codex install -u
npx debugsk@latest codex update -u
npx debugsk@latest codex remove -u
```

Default install target is `./.codex/skills` (current directory). Use `-u` to install to `~/.codex/skills`.
If `./.codex` does not exist, debugsk will ask before creating it.
