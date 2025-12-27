# Debug Investigation Framework (Vendor Neutral)

This repository provides a vendor-neutral, hypothesis-driven bug investigation framework as OSS. It contains:

1. A local debug log collector server (npx command)
2. A reusable Agent Skill for standardized investigation workflows
3. A Claude Code plugin + marketplace entry for distribution

The goal is to standardize the "instrument → reproduce → observe" loop without relying on any specific infrastructure or vendor.

## Quick start (local debug log server)

Install-free usage with npx:

```
npx @debug/server@latest start --json
```

The `start` command launches a background process, prints a single JSON line on stdout, and exits. The output includes connection info and snippets you can paste into the target code.

To stop:

```
npx @debug/server@latest stop --json
```

To check status:

```
npx @debug/server@latest status --json
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
  debug/
    runtime.json
    server.pid
    sessions/
      {sessionId}/
        {YYYY-MM-DD}/
          {runId}.jsonl
```

## Skill and plugin

- Skill: `skills/code-debug-skill/`
- Claude Code plugin: `plugins/code-debug-skill-plugin/`
- Marketplace file: `.claude-plugin/marketplace.json`

The Skill defines the standardized investigation workflow and instrumentation rules. The plugin bundles the Skill with commands and sub-agents.

## Repository structure

```
packages/
  debug-server/           # npx CLI + HTTP ingest server
skills/
  code-debug-skill/       # Agent Skill (SKILL.md + references + assets)
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
