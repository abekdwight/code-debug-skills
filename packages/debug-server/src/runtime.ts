import fs from 'node:fs/promises'
import { getPidPath, getRuntimeDir, getRuntimePath } from './paths'

export type RuntimeInfo = {
  ok: boolean
  version: string
  pid: number
  cwd: string
  logsDir: string
  running: boolean
  server: {
    host: string
    port: number
    baseUrl: string
    basePath: string
    endpoints: {
      health: string
      ingestTemplate: string
    }
  }
  startedAt: string
  stoppedAt?: string
  options: {
    maxBodyKB: number
    tokenEnabled: boolean
    idleTtlMs?: number
  }
}

export async function readRuntime(logsDir: string): Promise<RuntimeInfo | null> {
  try {
    const raw = await fs.readFile(getRuntimePath(logsDir), 'utf8')
    return JSON.parse(raw) as RuntimeInfo
  } catch {
    return null
  }
}

export async function writeRuntime(logsDir: string, info: RuntimeInfo): Promise<void> {
  await fs.mkdir(getRuntimeDir(logsDir), { recursive: true })
  await fs.writeFile(getRuntimePath(logsDir), JSON.stringify(info, null, 2), 'utf8')
}

export async function writePid(logsDir: string, pid: number): Promise<void> {
  await fs.mkdir(getRuntimeDir(logsDir), { recursive: true })
  await fs.writeFile(getPidPath(logsDir), String(pid), 'utf8')
}

export async function removePid(logsDir: string): Promise<void> {
  try {
    await fs.unlink(getPidPath(logsDir))
  } catch {
    return
  }
}

export async function markStopped(logsDir: string): Promise<void> {
  const current = await readRuntime(logsDir)
  if (!current) return
  const updated: RuntimeInfo = {
    ...current,
    running: false,
    stoppedAt: new Date().toISOString(),
  }
  await writeRuntime(logsDir, updated)
}
