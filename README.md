# Debug Investigation Skills

This repository standardizes the hypothesis-driven debugging process as reusable Skills for Claude Code and Codex, and provides a CLI with a local log server to make investigation instrumentation easy.

## Quick start (Claude Code)

**Option 1: Plugin (Recommended for most users)**

Add this GitHub repository as a marketplace, then install the plugin:

```
/plugin marketplace add abekdwight/code-debug-skills
/plugin install code-debug-skill@code-debug-skill-marketplace
```

Restart Claude Code after installation to load the plugin.

**Option 2: npx (For developers/testing)**

You can also install the skill directly using npx:

```
npx debugsk@latest claude install
npx debugsk@latest claude update
npx debugsk@latest claude remove
```

> **Warning**: Skills installed via npx take priority over plugin-installed skills. If you have both the plugin and a npx-installed skill, the npx-installed version will be used. To revert to the plugin version, run `npx debugsk@latest claude remove`.

`debugsk claude` installs to `./.claude/skills` by default (repo-local). Use `-u` to install to `~/.claude/skills`. If `./.claude` does not exist, debugsk will ask before creating it.

## Quick start (Codex)

Codex also supports interactive installs via [`$skill-installer`](https://developers.openai.com/codex/skills#create-a-skill), but it installs into `$CODEX_HOME/skills` (default `~/.codex/skills`), aborts if the destination already exists, and cannot update/remove. For install/update/remove, use `npx debugsk@latest codex`.

Use debugsk to install/update the skill, then restart Codex:

```
npx debugsk@latest codex install
npx debugsk@latest codex update
npx debugsk@latest codex remove
```

`debugsk codex` installs to `./.codex/skills` by default (repo-local). Use `-u` to install to `~/.codex/skills`. If `./.codex` does not exist, debugsk will ask before creating it.

## Quick start (local debug log server)

Note: This server is intended to be started by an AI workflow (via Skills). It is not meant as a manual end‑user tool. Use it only when an AI assistant instructs you to do so.

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

**YOU MUST ALWAYS include all required fields when logging. Never omit any field.**

Required fields:

- timestamp (ms epoch or ISO8601) — **ALWAYS include this**
- message — **ALWAYS include this**
- sessionId — **ALWAYS include this**
- runId — **ALWAYS include this**
- hypothesisId — **ALWAYS include this**

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

- Skill source of truth: `skills/code-debug-skill/`
- Claude Code plugin: `plugins/code-debug-skill-plugin/`
- Marketplace file: `.claude-plugin/marketplace.json`

The Skill defines the standardized investigation workflow and instrumentation rules. The plugin bundles the Skill only.

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
