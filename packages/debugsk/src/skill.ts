import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import readline from 'node:readline/promises'

export type Platform = 'codex' | 'claude'

export interface PlatformConfig {
  home: string
  skillName: string
  projectLocal: string
}

export const PLATFORMS: Record<Platform, PlatformConfig> = {
  codex: {
    home: '.codex',
    skillName: 'code-debug-skill',
    projectLocal: '.codex/skills',
  },
  claude: {
    home: '.claude',
    skillName: 'code-debug-skill',
    projectLocal: '.claude/skills',
  },
}

export interface InstallOptions {
  force?: boolean
  userScope?: boolean
}

export interface RemoveOptions {
  userScope?: boolean
}

export interface InstallResult {
  ok: boolean
  action: 'install' | 'update'
  scope: 'user' | 'local'
  dest: string
  source: string
  replaced: boolean
}

export interface RemoveResult {
  ok: boolean
  action: 'remove'
  scope: 'user' | 'local'
  dest: string
  removed: boolean
  reason?: string
}

export async function resolveSkillSource(skillName: string = 'code-debug-skill'): Promise<string> {
  const packageRoot = path.resolve(__dirname, '..')
  const repoRoot = path.resolve(packageRoot, '..', '..')
  const repoSource = path.join(repoRoot, 'skills', skillName)
  if (await pathExists(repoSource)) return repoSource
  const packaged = path.join(packageRoot, 'skills', skillName)
  if (await pathExists(packaged)) return packaged
  throw new Error(`missing_skill_source:${skillName}`)
}

export async function resolveSkillDest(
  platform: Platform,
  options: { userScope?: boolean; createIfMissing?: boolean } = {},
): Promise<{ dest: string; scope: 'user' | 'local'; homeExists: boolean }> {
  const config = PLATFORMS[platform]
  const useUser = Boolean(options.userScope)
  const scope: 'user' | 'local' = useUser ? 'user' : 'local'

  const platformHome = useUser
    ? path.join(os.homedir(), config.home)
    : path.join(process.cwd(), config.projectLocal.split('/')[0])

  const exists = await pathExists(platformHome)
  if (!exists && options.createIfMissing) {
    await ensurePlatformHome(platform, platformHome, scope)
  }

  const skillsDir = useUser ? path.join(platformHome, 'skills') : path.join(platformHome, 'skills')
  return {
    dest: path.join(skillsDir, config.skillName),
    scope,
    homeExists: exists,
  }
}

export async function installSkill(
  platform: Platform,
  options: InstallOptions = {},
): Promise<InstallResult> {
  const config = PLATFORMS[platform]
  const source = await resolveSkillSource(config.skillName)
  const { dest, scope } = await resolveSkillDest(platform, {
    userScope: options.userScope,
    createIfMissing: true,
  })
  const exists = await pathExists(dest)

  if (exists && !options.force) {
    throw new Error(`${platform}_skill_already_installed`)
  }

  await ensureSafeDest(dest)
  if (exists) {
    await fs.rm(dest, { recursive: true, force: true })
  }

  await fs.mkdir(path.dirname(dest), { recursive: true })
  await fs.cp(source, dest, { recursive: true })

  return {
    ok: true,
    action: options.force ? 'update' : 'install',
    scope,
    dest,
    source,
    replaced: exists,
  }
}

export async function removeSkill(
  platform: Platform,
  options: RemoveOptions = {},
): Promise<RemoveResult> {
  const config = PLATFORMS[platform]
  const { dest, scope, homeExists } = await resolveSkillDest(platform, {
    userScope: options.userScope,
    createIfMissing: false,
  })

  if (!homeExists) {
    return {
      ok: true,
      action: 'remove',
      scope,
      dest,
      removed: false,
      reason: `${platform}_home_missing`,
    }
  }

  await ensureSafeDest(dest)
  const exists = await pathExists(dest)
  if (exists) {
    await fs.rm(dest, { recursive: true, force: true })
  }

  return {
    ok: true,
    action: 'remove',
    scope,
    dest,
    removed: exists,
  }
}

export async function ensureSafeDest(dest: string): Promise<void> {
  const resolved = path.resolve(dest)
  const root = path.parse(resolved).root
  if (resolved === root || resolved === os.homedir()) {
    throw new Error('unsafe_dest')
  }
}

async function ensurePlatformHome(
  platform: Platform,
  platformHome: string,
  scope: 'user' | 'local',
): Promise<void> {
  if (await pathExists(platformHome)) return
  if (!process.stdin.isTTY) {
    throw new Error(`${platform}_home_missing`)
  }
  const prompt = `Create ${platformHome} for ${scope} scope? [y/N]: `
  const approved = await confirmPrompt(prompt)
  if (!approved) {
    throw new Error(`${platform}_home_missing`)
  }
  await fs.mkdir(platformHome, { recursive: true })
}

async function confirmPrompt(prompt: string): Promise<boolean> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stderr })
  const answer = await rl.question(prompt)
  rl.close()
  return /^y(es)?$/i.test(answer.trim())
}

export async function pathExists(target: string): Promise<boolean> {
  try {
    await fs.access(target)
    return true
  } catch {
    return false
  }
}
