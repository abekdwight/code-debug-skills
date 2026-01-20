import { installSkill, removeSkill } from './skill'

export async function claudeInstall(force: boolean, userScope: boolean): Promise<void> {
  try {
    const result = await installSkill('claude', { force, userScope })
    outputJsonResult(result)
  } catch (error) {
    outputError(error instanceof Error ? error.message : 'unexpected_error')
  }
}

export async function claudeUpdate(userScope: boolean): Promise<void> {
  await claudeInstall(true, userScope)
}

export async function claudeRemove(userScope: boolean): Promise<void> {
  try {
    const result = await removeSkill('claude', { userScope })
    outputJsonResult(result)
  } catch (error) {
    outputError(error instanceof Error ? error.message : 'unexpected_error')
  }
}

function outputJsonResult(payload: {
  ok: boolean
  action: string
  scope: string
  dest: string
  removed?: boolean
  replaced?: boolean
  reason?: string
}): void {
  const action = String(payload.action ?? 'result')
  const ok = payload.ok ? 'ok' : 'error'
  const dest = payload.dest ? `dest=${payload.dest}` : ''
  const status = payload.removed !== undefined ? (payload.removed ? 'removed' : 'not-removed') : ''
  const replaced = payload.replaced !== undefined ? (payload.replaced ? 'replaced' : 'new') : ''
  const reason = payload.reason ? `reason=${payload.reason}` : ''
  const parts = [action, ok, dest, status, replaced, reason].filter(Boolean)
  process.stdout.write(`${parts.join(' ')}\n`)
}

function outputError(message: string): void {
  process.stderr.write(`${message}\n`)
}
