import http from 'node:http'
import fs from 'node:fs/promises'
import path from 'node:path'
import { formatBaseUrl, resolvePort } from './net'
import { getSessionLogPath, resolveLogsDir } from './paths'
import { RuntimeInfo, markStopped, removePid, writePid, writeRuntime } from './runtime'
import { getPackageVersion } from './version'

export type StartOptions = {
  host: string
  port?: number
  basePath: string
  logsDir?: string
  maxBodyKB: number
  token?: string
  idleTtlMs?: number
  cwd: string
}

export type StartedServer = {
  server: http.Server
  host: string
  port: number
  basePath: string
  baseUrl: string
  logsDir: string
  close: () => Promise<void>
}

const REQUIRED_FIELDS = ['timestamp', 'message', 'sessionId', 'runId', 'hypothesisId'] as const
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Debug-Token',
  'Access-Control-Max-Age': '86400',
} as const

export async function startServer(options: StartOptions): Promise<StartedServer> {
  const logsDir = resolveLogsDir({ cwd: options.cwd, logsDir: options.logsDir })
  const host = options.host
  const basePath = normalizeBasePath(options.basePath)
  const port = await resolvePort(host, options.port)
  const baseUrl = formatBaseUrl(host, port)

  let idleTimer: NodeJS.Timeout | undefined
  const server = http.createServer(async (req, res) => {
    applyCorsHeaders(res)
    try {
      const url = new URL(req.url ?? '/', baseUrl)
      const normalizedPath = stripBasePath(url.pathname, basePath)

      if (normalizedPath == null) {
        respondJson(res, 404, { ok: false, error: 'not_found' })
        return
      }

      if (req.method === 'OPTIONS') {
        respondNoContent(res, 204)
        return
      }

      if (req.method === 'GET' && normalizedPath === '/health') {
        respondJson(res, 200, { ok: true })
        return
      }

      if (req.method === 'POST' && normalizedPath.startsWith('/ingest/')) {
        const streamId = decodeURIComponent(normalizedPath.replace('/ingest/', ''))
        if (!authorizeRequest(req, options.token)) {
          respondJson(res, 401, { ok: false, error: 'unauthorized' })
          return
        }

        let payload: unknown
        try {
          payload = await readJsonBody(req, options.maxBodyKB)
        } catch (error) {
          if (error instanceof BodyTooLargeError) {
            respondJson(res, 413, { ok: false, error: 'body_too_large' })
            return
          }
          respondJson(res, 400, { ok: false, error: 'invalid_json' })
          return
        }

        if (!payload || typeof payload !== 'object') {
          respondJson(res, 400, { ok: false, error: 'invalid_body' })
          return
        }

        const missing = REQUIRED_FIELDS.filter((field) => !(field in payload))
        if (missing.length > 0) {
          respondJson(res, 400, { ok: false, error: 'missing_fields', missing })
          return
        }

        const event = payload as Record<string, unknown>
        const sessionId = String(event.sessionId)
        const runId = String(event.runId)
        const timestamp = event.timestamp as string | number
        const logPath = getSessionLogPath(logsDir, sessionId, runId, timestamp)
        await fs.mkdir(path.dirname(logPath), { recursive: true })

        const enriched = {
          ...event,
          _meta: {
            streamId,
            receivedAt: Date.now(),
          },
        }

        await fs.appendFile(logPath, `${JSON.stringify(enriched)}\n`, 'utf8')

        if (options.idleTtlMs && options.idleTtlMs > 0) {
          resetIdleTimer(options.idleTtlMs)
        }

        respondJson(res, 200, { ok: true, written: true, path: logPath })
        return
      }

      respondJson(res, 404, { ok: false, error: 'not_found' })
    } catch {
      respondJson(res, 500, { ok: false, error: 'internal_error' })
    }
  })

  const close = async (): Promise<void> => {
    if (idleTimer) clearTimeout(idleTimer)
    await new Promise<void>((resolve, reject) => {
      server.close((err) => {
        if (err) reject(err)
        else resolve()
      })
    })
  }

  await new Promise<void>((resolve, reject) => {
    server.once('error', reject)
    server.listen(port, host, () => resolve())
  })

  const runtime: RuntimeInfo = {
    ok: true,
    version: getPackageVersion(),
    pid: process.pid,
    cwd: options.cwd,
    logsDir,
    running: true,
    server: {
      host,
      port,
      baseUrl,
      basePath,
      endpoints: {
        health: `${basePath}/health`,
        ingestTemplate: `${basePath}/ingest/{streamId}`,
      },
    },
    startedAt: new Date().toISOString(),
    options: {
      maxBodyKB: options.maxBodyKB,
      tokenEnabled: Boolean(options.token),
      idleTtlMs: options.idleTtlMs,
    },
  }

  await writeRuntime(logsDir, runtime)
  await writePid(logsDir, process.pid)

  if (options.idleTtlMs && options.idleTtlMs > 0) {
    resetIdleTimer(options.idleTtlMs)
  }

  return { server, host, port, basePath, baseUrl, logsDir, close }

  function resetIdleTimer(ttl: number): void {
    if (idleTimer) clearTimeout(idleTimer)
    idleTimer = setTimeout(async () => {
      await close()
      await markStopped(logsDir)
      await removePid(logsDir)
      process.exit(0)
    }, ttl)
  }
}

function normalizeBasePath(basePath: string): string {
  if (!basePath || basePath === '/') return ''
  const trimmed = basePath.startsWith('/') ? basePath : `/${basePath}`
  return trimmed.endsWith('/') ? trimmed.slice(0, -1) : trimmed
}

function stripBasePath(pathname: string, basePath: string): string | null {
  if (!basePath) return pathname
  if (!pathname.startsWith(basePath)) return null
  const sliced = pathname.slice(basePath.length)
  return sliced.length === 0 ? '/' : sliced
}

function authorizeRequest(req: http.IncomingMessage, token?: string): boolean {
  if (!token) return true
  const authHeader = req.headers.authorization
  if (authHeader && authHeader === `Bearer ${token}`) return true
  const headerToken = req.headers['x-debug-token']
  if (typeof headerToken === 'string' && headerToken === token) return true
  return false
}

function respondJson(res: http.ServerResponse, status: number, payload: unknown): void {
  const data = JSON.stringify(payload)
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json')
  res.setHeader('Content-Length', Buffer.byteLength(data))
  res.end(data)
}

function respondNoContent(res: http.ServerResponse, status: number): void {
  res.statusCode = status
  res.end()
}

function applyCorsHeaders(res: http.ServerResponse): void {
  for (const [key, value] of Object.entries(CORS_HEADERS)) {
    res.setHeader(key, value)
  }
}

class BodyTooLargeError extends Error {}

function readJsonBody(req: http.IncomingMessage, maxBodyKB: number): Promise<unknown> {
  const maxBytes = maxBodyKB * 1024
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    let size = 0
    let finished = false

    req.on('data', (chunk) => {
      if (finished) return
      size += chunk.length
      if (size > maxBytes) {
        finished = true
        req.destroy()
        reject(new BodyTooLargeError())
        return
      }
      chunks.push(chunk)
    })

    req.on('end', () => {
      if (finished) return
      finished = true
      try {
        const raw = Buffer.concat(chunks).toString('utf8')
        resolve(raw.length === 0 ? {} : JSON.parse(raw))
      } catch (error) {
        reject(error)
      }
    })

    req.on('error', (error) => {
      if (finished) return
      finished = true
      reject(error)
    })
  })
}
