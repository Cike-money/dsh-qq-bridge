import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const WEEK = '日一二三四五六'

/** 本地日期 YYYY-MM-DD（跟时间前缀一样用本地时区，别用 toISOString） */
export function localDate(d = new Date()) {
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** 一条运行日志：控制台 + 文件，文件写不进去也不影响跑 */
export function createLog(dir) {
  let file = ''
  try {
    mkdirSync(dir, { recursive: true })
    file = join(dir, 'bridge.log')
  } catch {}
  return (...args) => {
    const text = args.map((a) => (typeof a === 'string' ? a : JSON.stringify(a))).join(' ')
    console.log('[qq-bridge]', text)
    if (!file) return
    try {
      appendFileSync(file, `${new Date().toISOString()} ${text}\n`)
    } catch {}
  }
}

/** 按天追加流水：当天第一次写时补表头，只追加不改 */
export function appendDaily({ dir, kind, day = new Date(), line, header }) {
  if (!dir) return
  const date = localDate(day)
  const file = join(dir, `${kind}-${date}.md`)
  try {
    mkdirSync(dir, { recursive: true })
    if (!existsSync(file)) {
      const week = WEEK[day.getDay()]
      const title = kind === 'private' ? '私聊' : '群聊'
      writeFileSync(file, `${header ?? `# ${date} ${title}流水（星期${week}）`}\n\n一行一句，只追加不改，时间都是本地时间。\n\n`)
    }
    appendFileSync(file, `${line}\n`)
  } catch {}
}

/** 读当天流水的最后 n 行，给递消息时当背景 */
export function tailDaily({ dir, kind, day = new Date(), lines = 8, filter }) {
  if (!dir || !(lines > 0)) return []
  const file = join(dir, `${kind}-${localDate(day)}.md`)
  let text = ''
  try {
    text = readFileSync(file, 'utf8')
  } catch {
    return []
  }
  const rows = text.split('\n').filter((l) => l.startsWith('['))
  const picked = filter ? rows.filter(filter) : rows
  return picked.slice(-lines)
}