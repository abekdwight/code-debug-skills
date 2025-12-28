# Debug Investigation Framework (Vendor Neutral)

This repository provides a vendor-neutral, hypothesis-driven debug investigation framework as OSS. It contains:

1. **debugsk CLI** (server + Codex skill management)
2. **Agent Skill** for standardized investigation workflows
3. **Claude Code plugin** + marketplace entry for distribution

The goal is to standardize the "instrument → reproduce → observe" loop without relying on any specific infrastructure or vendor.
`debugsk` is short for **debug skill**.

## Quick start (Claude Code)

Add this GitHub repository as a marketplace, then install the plugin:

```
/plugin marketplace add abekdwight/code-debug-skills
/plugin install code-debug-skill@code-debug-skill-marketplace
```

Restart Claude Code after installation to load the plugin.

## Quick start (Codex)

Use debugsk to install/update the skill, then restart Codex:

```
npx debugsk@latest codex install
npx debugsk@latest codex update
npx debugsk@latest codex remove
```

## Quick start (local debug log server)

Install-free usage with npx:

```
npx debugsk@latest server start --json
```

The `start` command launches a background process, prints a single JSON line on stdout, and exits. The output includes connection info and snippets you can paste into the target code.

To stop:

```
npx debugsk@latest server stop --json
```

To check status:

```
npx debugsk@latest server status --json
```

## Log schema (minimal standard)

Required fields:

- timestamp (ms epoch or ISO8601)
- message
- sessionId
- runId
- hypothesisId

Optional fields:

- location
- level
- data
- traceId / requestId / spanId (if already available)

## Log storage layout

Logs are written as JSONL under `.logs/`:

```
.logs/
  runtime.json
  server.pid
  {sessionId}-{runId}.jsonl
```

## Skill and plugin

- Skill source of truth: `skills-src/code-debug-skill/`
- Generated Codex skill: `skills/code-debug-skill/`
- Claude Code plugin: `plugins/code-debug-skill-plugin/`
- Marketplace file: `.claude-plugin/marketplace.json`

The Skill defines the standardized investigation workflow and instrumentation rules. The plugin bundles the Skill with commands and sub-agents.

Sync the skill source to all targets:

```
pnpm run sync:skills
```

## Repository structure

```
packages/
  debugsk/                # CLI + HTTP ingest server
skills/
  code-debug-skill/       # Agent Skill (SKILL.md + references + assets)
skills-src/
  code-debug-skill/       # Skill source of truth
plugins/
  code-debug-skill-plugin/
.claude-plugin/
  marketplace.json
```

## Development

From the repository root (enable pnpm via Corepack if needed):

```
corepack enable
pnpm install
pnpm run build
pnpm run test
```

## License

MIT
