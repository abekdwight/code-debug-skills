import path from 'node:path'
import { DEFAULT_LOGS_DIR } from './constants'

type PathOptions = {
  cwd: string
  logsDir?: string
}

export function resolveLogsDir({ cwd, logsDir }: PathOptions): string {
  const dir = logsDir && logsDir.length > 0 ? logsDir : DEFAULT_LOGS_DIR
  return path.resolve(cwd, dir)
}

export function getRuntimeDir(logsDir: string): string {
  return path.join(logsDir, 'debug')
}

export function getRuntimePath(logsDir: string): string {
  return path.join(getRuntimeDir(logsDir), 'runtime.json')
}

export function getPidPath(logsDir: string): string {
  return path.join(getRuntimeDir(logsDir), 'server.pid')
}

export function getSessionsDir(logsDir: string): string {
  return path.join(getRuntimeDir(logsDir), 'sessions')
}

export function getSessionLogPath(
  logsDir: string,
  sessionId: string,
  runId: string,
  timestamp: string | number,
): string {
  const safeSession = sanitizePathSegment(sessionId)
  const safeRun = sanitizePathSegment(runId)
  const date = formatDate(timestamp)
  return path.join(getSessionsDir(logsDir), safeSession, date, `${safeRun}.jsonl`)
}

function sanitizePathSegment(value: string): string {
  return value.replace(/[\\/]/g, '_').replace(/\.\./g, '_').trim() || 'unknown'
}

function formatDate(value: string | number): string {
  const date = typeof value === 'number' ? new Date(value) : new Date(Date.parse(value))
  const safeDate = Number.isNaN(date.getTime()) ? new Date() : date
  return safeDate.toISOString().slice(0, 10)
}
