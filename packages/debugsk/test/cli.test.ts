import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { createRequire } from 'node:module'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { execa } from 'execa'

const cliPath = path.resolve(__dirname, '../src/cli.ts')
const require = createRequire(import.meta.url)
const tsxLoader = require.resolve('tsx')

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
      tsxLoader,
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
      tsxLoader,
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
      tsxLoader,
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
    const codexHome = path.join(tempDir, '.codex')
    const dest = path.join(codexHome, 'skills', 'code-debug-skill')
    await fs.mkdir(codexHome, { recursive: true })

    const install = await execa(
      process.execPath,
      ['--import', tsxLoader, cliPath, 'codex', 'install', '--json'],
      { cwd: tempDir },
    )

    const installPayload = JSON.parse(install.stdout) as Record<string, unknown>
    expect(installPayload.ok).toBe(true)

    const stat = await fs.stat(dest)
    expect(stat.isDirectory()).toBe(true)

    const remove = await execa(
      process.execPath,
      ['--import', tsxLoader, cliPath, 'codex', 'remove', '--json'],
      { cwd: tempDir },
    )

    const removePayload = JSON.parse(remove.stdout) as Record<string, unknown>
    expect(removePayload.ok).toBe(true)
  })
})
