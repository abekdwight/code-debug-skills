import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import supertest from 'supertest'
import { beforeEach, afterEach, describe, expect, it } from 'vitest'
import { startServer } from '../src/server'

const REQUIRED_EVENT = {
  timestamp: Date.now(),
  message: 'enter: example()',
  sessionId: 'session-1',
  runId: 'run-1',
  hypothesisId: 'H1',
}

describe('debug observer server', () => {
  let tempDir: string

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'debug-'))
  })

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true })
  })

  it('accepts health checks and ingest', async () => {
    const started = await startServer({
      host: '127.0.0.1',
      port: 0,
      basePath: '/',
      logsDir: path.join(tempDir, 'logs'),
      maxBodyKB: 64,
      cwd: tempDir,
    })

    const request = supertest(started.baseUrl)

    await request.get('/health').expect(200)

    const ingest = await request
      .post('/ingest/test-stream')
      .set('Content-Type', 'application/json')
      .send(REQUIRED_EVENT)
      .expect(200)

    expect(ingest.body.ok).toBe(true)
    expect(ingest.body.written).toBe(true)

    await started.close()

    const logPath = path.join(
      started.logsDir,
      `${REQUIRED_EVENT.sessionId}-${REQUIRED_EVENT.runId}.jsonl`,
    )

    const content = await fs.readFile(logPath, 'utf8')
    const lines = content.trim().split('\n')
    expect(lines.length).toBeGreaterThanOrEqual(1)
    const parsed = JSON.parse(lines[0]) as Record<string, unknown>
    expect(parsed.message).toBe(REQUIRED_EVENT.message)
    expect(parsed._meta).toBeTruthy()
  })

  it('rejects missing required fields', async () => {
    const started = await startServer({
      host: '127.0.0.1',
      port: 0,
      basePath: '/',
      logsDir: path.join(tempDir, 'logs'),
      maxBodyKB: 64,
      cwd: tempDir,
    })

    const request = supertest(started.baseUrl)

    const response = await request
      .post('/ingest/test-stream')
      .set('Content-Type', 'application/json')
      .send({ message: 'missing required' })
      .expect(400)

    expect(response.body.ok).toBe(false)
    expect(response.body.error).toBe('missing_fields')

    await started.close()
  })

  it('responds to CORS preflight', async () => {
    const started = await startServer({
      host: '127.0.0.1',
      port: 0,
      basePath: '/',
      logsDir: path.join(tempDir, 'logs'),
      maxBodyKB: 64,
      cwd: tempDir,
    })

    const request = supertest(started.baseUrl)

    const response = await request.options('/ingest/test-stream').expect(204)
    expect(response.headers['access-control-allow-origin']).toBe('*')
    expect(response.headers['access-control-allow-methods']).toContain('POST')

    await started.close()
  })
})
