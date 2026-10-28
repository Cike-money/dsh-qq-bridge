import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'
import { spawn } from 'node:child_process'

// NapCat 常见的启动文件；只认这几个名字，避免误启动别的东西
const LAUNCHERS = ['NapCatWinBootMain.exe', 'napcat.bat', 'start.bat', 'launcher.bat', 'NapCat.Shell.exe', 'napcat.sh']

/**
 * 在给定目录和几个常见位置里找 NapCat 的启动文件。
 * 只往下翻两层，别把整个盘扫一遍。
 */
export function findNapCat(dir = '') {
  const roots = []
  if (dir) roots.push(dir)
  if (process.env.LOCALAPPDATA) roots.push(join(process.env.LOCALAPPDATA, 'NapCat'), join(process.env.LOCALAPPDATA, 'Programs', 'NapCat'))
  roots.push(join(homedir(), 'NapCat'), 'D:\\napcat', 'C:\\napcat', 'D:\\NapCat')
  for (const root of roots) {
    if (!root || !existsSync(root)) continue
    const hit = scan(root, 2)
    if (hit) return hit
  }
  return ''
}

function scan(dir, depth) {
  let entries = []
  try {
    entries = readdirSync(dir, { withFileTypes: true })
  } catch {
    return ''
  }
  for (const entry of entries) {
    if (entry.isFile() && LAUNCHERS.includes(entry.name)) return join(dir, entry.name)
  }
  if (depth <= 0) return ''
  for (const entry of entries) {
    if (!entry.isDirectory()) continue
    const hit = scan(join(dir, entry.name), depth - 1)
    if (hit) return hit
  }
  return ''
}

/**
 * 从 NapCat 的 onebot 配置里读出它实际开的端口和口令。
 * 配置在 <启动文件所在目录>/config/onebot11_<QQ>.json，按修改时间挑最新的一份。
 */
export function readOnebotConfig(dir) {
  if (!dir) return null
  const configDir = join(dir, 'config')
  let names = []
  try {
    names = readdirSync(configDir).filter((name) => /^onebot11_.*\.json$/.test(name))
  } catch {
    return null
  }
  if (!names.length) return null
  let newest = ''
  let newestAt = 0
  for (const name of names) {
    try {
      const { mtimeMs } = statSync(join(configDir, name))
      if (mtimeMs > newestAt) {
        newestAt = mtimeMs
        newest = name
      }
    } catch {}
  }
  try {
    const raw = readFileSync(join(configDir, newest), 'utf8').replace(/^\uFEFF/, '')
    const doc = JSON.parse(raw)
    const http = (doc?.network?.httpServers ?? []).find((item) => item?.enable !== false)
    const ws = (doc?.network?.websocketServers ?? []).find((item) => item?.enable !== false)
    if (!http && !ws) return null
    return {
      file: join(configDir, newest),
      http: http ? { port: Number(http.port) || 3000, token: String(http.token ?? ''), host: String(http.host || '127.0.0.1') } : null,
      ws: ws ? { port: Number(ws.port) || 3001, token: String(ws.token ?? ''), host: String(ws.host || '127.0.0.1') } : null,
    }
  } catch {
    return null
  }
}

/** 从启动文件往上找 NapCat 的根目录（启动文件可能在 shell/ 里） */
export function napCatRoot(launcher) {
  if (!launcher) return ''
  let dir = dirname(launcher)
  for (let i = 0; i < 3; i++) {
    try {
      const entries = readdirSync(dir)
      if (entries.includes('config') && entries.includes('package.json')) return dir
    } catch {}
    const parent = dirname(dir)
    if (parent === dir) break
    dir = parent
  }
  return dirname(launcher)
}

/** 拉起 NapCat（detached，插件退出也不影响它） */
export function launchNapCat(launcher) {
  if (!launcher) return false
  const child = spawn(launcher, [], { cwd: dirname(launcher), detached: true, stdio: 'ignore', windowsHide: false })
  child.unref()
  return true
}