import net from 'node:net'

export async function resolvePort(host: string, port: number | undefined): Promise<number> {
  if (!port || port === 0) {
    return getRandomPort(host)
  }

  try {
    await checkPort(host, port)
    return port
  } catch {
    return getRandomPort(host)
  }
}

export function formatBaseUrl(host: string, port: number): string {
  const needsBrackets = host.includes(':') && !host.startsWith('[')
  const safeHost = needsBrackets ? `[${host}]` : host
  return `http://${safeHost}:${port}`
}

function checkPort(host: string, port: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const server = net.createServer()
    server.once('error', (error) => {
      server.close()
      reject(error)
    })
    server.listen(port, host, () => {
      server.close(() => resolve())
    })
  })
}

function getRandomPort(host: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = net.createServer()
    server.once('error', (error) => {
      server.close()
      reject(error)
    })
    server.listen(0, host, () => {
      const address = server.address()
      if (!address || typeof address === 'string') {
        server.close(() => reject(new Error('Failed to resolve port')))
        return
      }
      const selected = address.port
      server.close(() => resolve(selected))
    })
  })
}
