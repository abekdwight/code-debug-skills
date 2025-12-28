export function isProcessAlive(pid: number): boolean {
  if (!pid) return false
  try {
    process.kill(pid, 0)
    return true
  } catch (error) {
    const err = error as NodeJS.ErrnoException
    return err.code === 'EPERM'
  }
}

export async function terminateProcess(pid: number, timeoutMs: number): Promise<boolean> {
  if (!isProcessAlive(pid)) return true
  try {
    process.kill(pid, 'SIGTERM')
  } catch (error) {
    const err = error as NodeJS.ErrnoException
    if (err.code === 'ESRCH') return true
  }

  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    if (!isProcessAlive(pid)) return true
    await sleep(100)
  }

  try {
    process.kill(pid, 'SIGKILL')
  } catch (error) {
    const err = error as NodeJS.ErrnoException
    if (err.code === 'ESRCH') return true
  }

  return !isProcessAlive(pid)
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
