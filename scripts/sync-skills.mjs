import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')

const source = path.join(repoRoot, 'skills-src', 'code-debug-skill')
const targets = [
  path.join(repoRoot, 'skills', 'code-debug-skill'),
  path.join(repoRoot, 'plugins', 'code-debug-skill-plugin', 'skills', 'code-debug-skill'),
  path.join(repoRoot, 'packages', 'debugsk', 'skills', 'code-debug-skill'),
]

await ensureDir(path.dirname(source))
if (!(await exists(source))) {
  throw new Error(`missing skill source: ${source}`)
}

for (const target of targets) {
  await fs.rm(target, { recursive: true, force: true })
  await ensureDir(path.dirname(target))
  await fs.cp(source, target, { recursive: true })
}

async function exists(target) {
  try {
    await fs.access(target)
    return true
  } catch {
    return false
  }
}

async function ensureDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true })
}
