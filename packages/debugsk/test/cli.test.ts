import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { execa } from 'execa'

const cliPath = path.resolve(__dirname, '../src/cli.ts')

describe('debugsk cli', () => {
  let tempDir: string

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'debug-cli-'))
  })

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true })
  })

  it('start/status/stop lifecycle', async () => {
    const start = await execa(process.execPath, [
      '--import',
      'tsx',
      cliPath,
      'start',
      '--json',
      '--port',
      '0',
      '--logs-dir',
      path.join(tempDir, 'logs'),
    ])

    const started = JSON.parse(start.stdout) as Record<string, unknown>
    expect(started.ok).toBe(true)
    expect(started.server).toBeTruthy()

    const status = await execa(process.execPath, [
      '--import',
      'tsx',
      cliPath,
      'status',
      '--json',
      '--logs-dir',
      path.join(tempDir, 'logs'),
    ])

    const statusPayload = JSON.parse(status.stdout) as Record<string, unknown>
    expect(statusPayload.ok).toBe(true)
    expect(statusPayload.running).toBe(true)

    const stop = await execa(process.execPath, [
      '--import',
      'tsx',
      cliPath,
      'stop',
      '--json',
      '--logs-dir',
      path.join(tempDir, 'logs'),
    ])

    const stopPayload = JSON.parse(stop.stdout) as Record<string, unknown>
    expect(stopPayload.ok).toBe(true)
  })

  it('codex install/remove lifecycle', async () => {
    const dest = path.join(tempDir, 'codex', 'code-debug-skill')

    const install = await execa(process.execPath, [
      '--import',
      'tsx',
      cliPath,
      'codex',
      'install',
      '--json',
      '--dest',
      dest,
    ])

    const installPayload = JSON.parse(install.stdout) as Record<string, unknown>
    expect(installPayload.ok).toBe(true)

    const status = await execa(process.execPath, [
      '--import',
      'tsx',
      cliPath,
      'codex',
      'status',
      '--json',
      '--dest',
      dest,
    ])

    const statusPayload = JSON.parse(status.stdout) as Record<string, unknown>
    expect(statusPayload.installed).toBe(true)

    const remove = await execa(process.execPath, [
      '--import',
      'tsx',
      cliPath,
      'codex',
      'remove',
      '--json',
      '--dest',
      dest,
    ])

    const removePayload = JSON.parse(remove.stdout) as Record<string, unknown>
    expect(removePayload.ok).toBe(true)
  })
})
