#!/usr/bin/env node
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import minimist from 'minimist'
import {
  DEFAULT_BASE_PATH,
  DEFAULT_HOST,
  DEFAULT_LOGS_DIR,
  DEFAULT_MAX_BODY_KB,
  DEFAULT_PORT,
} from './constants'
import { isProcessAlive, terminateProcess } from './process'
import { resolveLogsDir } from './paths'
import { RuntimeInfo, markStopped, readRuntime, removePid } from './runtime'
import { startServer } from './server'

const args = minimist(process.argv.slice(2), {
  boolean: ['json', 'force', 'help'],
  string: ['host', 'base-path', 'logs-dir', 'token', 'dest', 'codex-home'],
  alias: {
    h: 'help',
  },
})

const primary = String(args._[0] ?? 'help')
const secondary = args._[1] ? String(args._[1]) : undefined
const scope = primary === 'server' || primary === 'codex' ? primary : 'server'
const command =
  scope === 'server' ? String(primary === 'server' ? secondary ?? 'help' : primary) : String(secondary ?? 'help')

const json = Boolean(args.json)
const SKILL_NAME = 'code-debug-skill'

void main().catch((error) => {
  outputError(error instanceof Error ? error.message : 'unexpected_error')
  process.exitCode = 1
})

async function main(): Promise<void> {
  if (args.help || command === 'help') {
    printHelp()
    return
  }

  if (scope === 'codex') {
    await handleCodex(command)
    return
  }

  switch (command) {
    case 'start':
      await handleStart()
      return
    case 'run':
      await handleRun()
      return
    case 'status':
      await handleStatus()
      return
    case 'stop':
      await handleStop()
      return
    default:
      outputError(`unknown_command:${command}`)
  }
}

function getCommonOptions() {
  const host = String(args.host ?? DEFAULT_HOST)
  const port = parseNumber(args.port, DEFAULT_PORT) ?? DEFAULT_PORT
  const basePath = String(args['base-path'] ?? DEFAULT_BASE_PATH)
  const logsDir = args['logs-dir'] ? String(args['logs-dir']) : undefined
  const maxBodyKB = parseNumber(args['max-body-kb'], DEFAULT_MAX_BODY_KB) ?? DEFAULT_MAX_BODY_KB
  const token = args.token ? String(args.token) : undefined
  const idleTtlMs = parseNumber(args['idle-ttl-ms'], undefined)
  return { host, port, basePath, logsDir, maxBodyKB, token, idleTtlMs }
}

async function handleStart(): Promise<void> {
  const { host, port, basePath, logsDir, maxBodyKB, token, idleTtlMs } = getCommonOptions()
  const cwd = process.cwd()
  const resolvedLogsDir = resolveLogsDir({ cwd, logsDir })
  const runtime = await readRuntime(resolvedLogsDir)

  if (runtime && !runtime.options) {
    outputLegacyRuntimeError()
    return
  }

  if (runtime && isProcessAlive(runtime.pid) && !args.force) {
    const payload = buildStartOutput(runtime, true)
    outputStart(payload)
    return
  }

  if (runtime && isProcessAlive(runtime.pid) && args.force) {
    await terminateProcess(runtime.pid, 3000)
    await markStopped(resolvedLogsDir)
    await removePid(resolvedLogsDir)
  }

  if (runtime && !isProcessAlive(runtime.pid)) {
    await markStopped(resolvedLogsDir)
    await removePid(resolvedLogsDir)
  }

  const spawnResult = await spawnBackground({
    host,
    port,
    basePath,
    logsDir,
    maxBodyKB,
    token,
    idleTtlMs,
  })

  const finalRuntime = await waitForRuntime(resolvedLogsDir, 5000)
  if (!finalRuntime) {
    outputError('start_failed')
    return
  }

  const ok = await waitForHealth(finalRuntime, 5000)
  if (!ok) {
    outputError('health_check_failed')
    return
  }

  const payload = buildStartOutput(finalRuntime, false, spawnResult?.pid)
  outputStart(payload)
}

async function handleRun(): Promise<void> {
  const { host, port, basePath, logsDir, maxBodyKB, token, idleTtlMs } = getCommonOptions()
  const cwd = process.cwd()

  const started = await startServer({
    host,
    port,
    basePath,
    logsDir,
    maxBodyKB,
    token,
    idleTtlMs,
    cwd,
  })

  installSignalHandlers(started.logsDir, started.close)

  if (!json) {
    logInfo(`debugsk server listening at ${started.baseUrl}`)
  }
}

async function handleStatus(): Promise<void> {
  const cwd = process.cwd()
  const logsDir = args['logs-dir'] ? String(args['logs-dir']) : undefined
  const resolvedLogsDir = resolveLogsDir({ cwd, logsDir })
  const runtime = await readRuntime(resolvedLogsDir)

  if (!runtime) {
    outputStatus({ ok: false, running: false, error: 'not_running' })
    return
  }
  if (!runtime.options) {
    outputLegacyRuntimeError()
    return
  }

  const running = isProcessAlive(runtime.pid)
  const payload = {
    ...runtime,
    running,
  }
  outputStatus(payload)
}

async function handleStop(): Promise<void> {
  const cwd = process.cwd()
  const logsDir = args['logs-dir'] ? String(args['logs-dir']) : undefined
  const resolvedLogsDir = resolveLogsDir({ cwd, logsDir })
  const runtime = await readRuntime(resolvedLogsDir)

  if (!runtime) {
    outputStop({ ok: true, stopped: false, running: false })
    return
  }

  const stopped = await terminateProcess(runtime.pid, 3000)
  if (stopped) {
    await markStopped(resolvedLogsDir)
    await removePid(resolvedLogsDir)
  }

  outputStop({ ok: true, stopped, pid: runtime.pid })
}

async function handleCodex(subcommand: string): Promise<void> {
  switch (subcommand) {
    case 'install':
      await codexInstall(false)
      return
    case 'update':
      await codexInstall(true)
      return
    case 'remove':
      await codexRemove()
      return
    case 'status':
      await codexStatus()
      return
    default:
      outputError(`unknown_command:codex:${subcommand}`)
  }
}

async function codexInstall(force: boolean): Promise<void> {
  const source = await resolveSkillSource()
  const dest = resolveCodexDest()
  const exists = await pathExists(dest)

  if (exists && !force) {
    outputError('codex_skill_already_installed')
    return
  }

  await ensureSafeDest(dest)
  if (exists) {
    await fs.rm(dest, { recursive: true, force: true })
  }

  await fs.mkdir(path.dirname(dest), { recursive: true })
  await fs.cp(source, dest, { recursive: true })

  outputJsonResult({
    ok: true,
    action: force ? 'update' : 'install',
    dest,
    source,
    replaced: exists,
  })
}

async function codexRemove(): Promise<void> {
  const dest = resolveCodexDest()
  await ensureSafeDest(dest)
  const exists = await pathExists(dest)
  if (exists) {
    await fs.rm(dest, { recursive: true, force: true })
  }
  outputJsonResult({
    ok: true,
    action: 'remove',
    dest,
    removed: exists,
  })
}

async function codexStatus(): Promise<void> {
  const dest = resolveCodexDest()
  const installed = await pathExists(dest)
  outputJsonResult({
    ok: true,
    action: 'status',
    dest,
    installed,
  })
}

async function resolveSkillSource(): Promise<string> {
  const packageRoot = path.resolve(__dirname, '..')
  const repoRoot = path.resolve(packageRoot, '..', '..')
  const repoSource = path.join(repoRoot, 'skills', SKILL_NAME)
  if (await pathExists(repoSource)) return repoSource
  const packaged = path.join(packageRoot, 'skills', SKILL_NAME)
  if (await pathExists(packaged)) return packaged
  throw new Error(`missing_skill_source:${SKILL_NAME}`)
}

function resolveCodexDest(): string {
  if (args.dest) return path.resolve(String(args.dest))
  const codexHome = args['codex-home']
    ? path.resolve(String(args['codex-home']))
    : process.env.CODEX_HOME
      ? path.resolve(String(process.env.CODEX_HOME))
      : path.join(os.homedir(), '.codex')
  return path.join(codexHome, 'skills', SKILL_NAME)
}

async function ensureSafeDest(dest: string): Promise<void> {
  const resolved = path.resolve(dest)
  const root = path.parse(resolved).root
  if (resolved === root || resolved === os.homedir()) {
    throw new Error('unsafe_dest')
  }
}

async function pathExists(target: string): Promise<boolean> {
  try {
    await fs.access(target)
    return true
  } catch {
    return false
  }
}

async function spawnBackground(options: {
  host: string
  port: number
  basePath: string
  logsDir?: string
  maxBodyKB: number
  token?: string
  idleTtlMs?: number
}): Promise<{ pid: number } | null> {
  const nodeArgs = [...process.execArgv, process.argv[1]]
  const cmdArgs = ['run']

  cmdArgs.push('--host', options.host)
  cmdArgs.push('--port', String(options.port))
  cmdArgs.push('--base-path', options.basePath)
  cmdArgs.push('--max-body-kb', String(options.maxBodyKB))
  if (options.logsDir) cmdArgs.push('--logs-dir', options.logsDir)
  if (options.token) cmdArgs.push('--token', options.token)
  if (options.idleTtlMs) cmdArgs.push('--idle-ttl-ms', String(options.idleTtlMs))

  const spawn = await import('node:child_process')
  const child = spawn.spawn(process.execPath, [...nodeArgs, ...cmdArgs], {
    detached: true,
    stdio: 'ignore',
    env: {
      ...process.env,
      DEBUG_OBSERVER_CHILD: '1',
    },
  })
  child.unref()
  return child.pid ? { pid: child.pid } : null
}

async function waitForRuntime(logsDir: string, timeoutMs: number): Promise<RuntimeInfo | null> {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    const runtime = await readRuntime(logsDir)
    if (runtime && runtime.pid) return runtime
    await sleep(100)
  }
  return null
}

async function waitForHealth(runtime: RuntimeInfo, timeoutMs: number): Promise<boolean> {
  const url = new URL(runtime.server.endpoints.health, runtime.server.baseUrl)
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    const ok = await checkHealth(url)
    if (ok) return true
    await sleep(100)
  }
  return false
}

async function checkHealth(url: URL): Promise<boolean> {
  const http = await import('node:http')
  return new Promise((resolve) => {
    const req = http.get(url, (res) => {
      res.resume()
      resolve(res.statusCode === 200)
    })
    req.on('error', () => resolve(false))
  })
}

function buildStartOutput(runtime: RuntimeInfo, existing: boolean, spawnedPid?: number) {
  const ingestPath = runtime.server.endpoints.ingestTemplate
  const ingestUrl = new URL(ingestPath.replace('{streamId}', '{streamId}'), runtime.server.baseUrl)
  const snippetHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  const tokenEnabled = runtime.options.tokenEnabled
  if (tokenEnabled) {
    snippetHeaders.Authorization = 'Bearer YOUR_TOKEN'
  }

  const jsFetch = `fetch("${ingestUrl.toString()}",{method:"POST",headers:${JSON.stringify(
    snippetHeaders,
  )},body:JSON.stringify({...})}).catch(()=>{});`

  return {
    ok: true,
    version: runtime.version,
    pid: runtime.pid,
    cwd: runtime.cwd,
    logsDir: runtime.logsDir,
    server: {
      host: runtime.server.host,
      port: runtime.server.port,
      baseUrl: runtime.server.baseUrl,
      endpoints: runtime.server.endpoints,
    },
    snippets: {
      jsFetch,
    },
    existing,
    spawnedPid,
  }
}

function installSignalHandlers(logsDir: string, close: () => Promise<void>): void {
  const shutdown = async () => {
    await close()
    await markStopped(logsDir)
    await removePid(logsDir)
    process.exit(0)
  }

  process.on('SIGTERM', () => void shutdown())
  process.on('SIGINT', () => void shutdown())
}

function outputJson(payload: unknown): void {
  process.stdout.write(`${JSON.stringify(payload)}\n`)
}

function outputJsonResult(payload: Record<string, unknown>): void {
  if (json) {
    outputJson(payload)
    return
  }
  const action = String(payload.action ?? 'result')
  const ok = payload.ok ? 'ok' : 'error'
  const dest = payload.dest ? `dest=${payload.dest}` : ''
  process.stdout.write(`${action} ${ok} ${dest}\n`)
}

function outputError(message: string): void {
  if (json) {
    outputJson({ ok: false, error: message })
  } else {
    process.stderr.write(`${message}\n`)
  }
}

function outputLegacyRuntimeError(): void {
  const error = 'legacy_runtime_incompatible'
  const hint = 'delete .logs/runtime.json or the entire .logs directory, then retry'
  if (json) {
    outputJson({ ok: false, error, hint })
  } else {
    process.stderr.write(`${error}: ${hint}\n`)
  }
}

function logInfo(message: string): void {
  process.stderr.write(`${message}\n`)
}

function outputStart(payload: Record<string, unknown>): void {
  if (json) {
    outputJson(payload)
    return
  }
  const server = payload.server as RuntimeInfo['server']
  const pid = payload.pid as number
  const logsDir = payload.logsDir as string
  process.stdout.write(
    `started pid=${pid} baseUrl=${server.baseUrl} logsDir=${logsDir}\n`,
  )
}

function outputStatus(payload: Record<string, unknown>): void {
  if (json) {
    outputJson(payload)
    return
  }
  const running = payload.running ? 'running' : 'stopped'
  const pid = payload.pid ? `pid=${payload.pid}` : 'pid=unknown'
  process.stdout.write(`status ${running} ${pid}\n`)
}

function outputStop(payload: Record<string, unknown>): void {
  if (json) {
    outputJson(payload)
    return
  }
  const stopped = payload.stopped ? 'stopped' : 'not-stopped'
  const pid = payload.pid ? `pid=${payload.pid}` : ''
  process.stdout.write(`stop ${stopped} ${pid}\n`)
}

function printHelp(): void {
  const text = `debugsk

Usage:
  server start --json     Start server in background and print JSON
  server run              Run server in foreground
  server status --json    Show server status
  server stop --json      Stop background server

  codex install           Install Codex skill (user scope)
  codex update            Update Codex skill (user scope)
  codex remove            Remove Codex skill (user scope)
  codex status            Show Codex skill status

Aliases:
  start/run/status/stop   Same as "server <command>"

Options:
  --host            (default ${DEFAULT_HOST})
  --port            (default ${DEFAULT_PORT})
  --base-path       (default ${DEFAULT_BASE_PATH})
  --logs-dir        (default ${DEFAULT_LOGS_DIR})
  --max-body-kb     (default ${DEFAULT_MAX_BODY_KB})
  --token           (optional)
  --idle-ttl-ms     (optional)
  --force           (restart even if already running)
  --json            (stdout JSON only)
  --dest            (Codex skill destination path)
  --codex-home      (override CODEX_HOME)
`
  if (json) {
    outputJson({ ok: true, help: text })
  } else {
    process.stdout.write(`${text}\n`)
  }
}

function parseNumber(value: unknown, fallback: number | undefined): number | undefined {
  if (value === undefined || value === null || value === '') {
    return fallback
  }
  const parsed = Number(value)
  if (Number.isFinite(parsed)) return parsed
  return fallback
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
