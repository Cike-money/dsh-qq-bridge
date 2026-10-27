// 纯函数：时间前缀、静默判断、分气泡、触发判断。
// 这里不碰网络也不碰文件，单测直接测这个文件。

/** 本地时间 HH:MM（跟着进程时区走） */
export function clock(ms) {
  const d = new Date(Number(ms))
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

/** 私聊正文：可选 [HH:MM] 前缀 */
export function privateBody(text, timeMs, { timePrefix = true } = {}) {
  const t = String(text ?? '').trim()
  if (!t) return ''
  return timePrefix ? `[${clock(timeMs)}] ${t}` : t
}

/** 群聊正文：[HH:MM 昵称(QQ)] 内容（群 X）；prefix 关掉就只留内容 */
export function groupBody(text, { timeMs, name, userId, groupId, atMe = false, prefix = true } = {}) {
  const t = String(text ?? '').trim()
  if (!prefix) return t ? `${t}（群 ${groupId}）` : ''
  const who = name || String(userId)
  const head = `[${clock(timeMs)} ${who}(${userId})]${atMe ? ' [@我]' : ''}`
  return t ? `${head} ${t}（群 ${groupId}）` : head
}

/** 整句正好是静默词（或空着）→ 不发 */
export function isQuiet(reply, words = ['SILENT']) {
  const text = String(reply ?? '').trim()
  if (!text) return true
  const lower = text.toLowerCase()
  return (words ?? []).some((word) => String(word).trim() && lower === String(word).trim().toLowerCase())
}

/** 分气泡：一行一句，去掉零宽字符和空行，最多 max 行 */
export function splitBubbles(reply, max = 4) {
  const lines = String(reply ?? '')
    .split(/\r?\n/)
    .map((line) => line.replace(/[\u200b-\u200f\u2060\ufeff]/g, '').trim())
    .filter(Boolean)
  return lines.slice(0, Math.max(1, Number(max) || 4))
}

/** 群里这条消息要不要递给我 */
export function shouldPush({ atMe = false, text = '', userId, whitelist = [], keywords = [], watchAll = false, ownerQQ } = {}) {
  if (atMe) return true
  const body = String(text ?? '')
  if ((keywords ?? []).some((word) => String(word ?? '').trim() && body.includes(String(word)))) return true
  const ids = [ownerQQ, ...(whitelist ?? [])].filter((id) => id !== undefined && id !== null && id !== '').map(Number)
  if (ids.includes(Number(userId))) return true
  return watchAll === true
}

/** 这个私聊该不该回 */
export function privateAllowed(userId, { ownerQQ, whitelist = [], replyStrangers = false } = {}) {
  const id = Number(userId)
  if (Number(ownerQQ) === id) return true
  if ((whitelist ?? []).map(Number).includes(id)) return true
  return replyStrangers === true
}

/** 从消息段里取出纯文本和图片 */
export function readMessage(segments) {
  if (typeof segments === 'string') return { plain: segments.trim(), images: [], atMe: false }
  const plain = []
  const images = []
  let atMe = false
  for (const seg of segments ?? []) {
    if (seg?.type === 'text') plain.push(seg.data?.text ?? '')
    else if (seg?.type === 'image') images.push(seg.data?.url ?? seg.data?.file ?? '')
    else if (seg?.type === 'at') plain.push(`@${seg.data?.qq ?? ''}`)
  }
  return { plain: plain.join('').trim(), images, atMe }
}