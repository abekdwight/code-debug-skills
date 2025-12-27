import fs from 'node:fs'
import path from 'node:path'

export function getPackageVersion(): string {
  try {
    const pkgPath = findPackageJsonPath()
    const raw = fs.readFileSync(pkgPath, 'utf8')
    const data = JSON.parse(raw) as { version?: string }
    return data.version ?? '0.0.0'
  } catch {
    return '0.0.0'
  }
}

function findPackageJsonPath(): string {
  let current = path.resolve(__dirname)
  for (let i = 0; i < 5; i += 1) {
    const candidate = path.join(current, 'package.json')
    if (fs.existsSync(candidate)) return candidate
    current = path.dirname(current)
  }
  return path.join(process.cwd(), 'package.json')
}
