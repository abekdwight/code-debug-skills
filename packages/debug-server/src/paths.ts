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
  return logsDir
}

export function getRuntimePath(logsDir: string): string {
  return path.join(getRuntimeDir(logsDir), 'runtime.json')
}

export function getPidPath(logsDir: string): string {
  return path.join(getRuntimeDir(logsDir), 'server.pid')
}

export function getSessionLogPath(
  logsDir: string,
  sessionId: string,
  runId: string,
  _timestamp: string | number,
): string {
  const safeSession = sanitizePathSegment(sessionId)
  const safeRun = sanitizePathSegment(runId)
  return path.join(getRuntimeDir(logsDir), `${safeSession}-${safeRun}.jsonl`)
}

function sanitizePathSegment(value: string): string {
  return value.replace(/[\\/]/g, '_').replace(/\.\./g, '_').trim() || 'unknown'
}
