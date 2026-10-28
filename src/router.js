import { appendDaily, tailDaily } from './log.js'
import { clock, groupBody, isQuiet, privateAllowed, privateBody, readMessage, shouldPush, splitBubbles } from './format.js'

/**
 * 消息路由：收到 QQ 消息 → 判断该不该递 → 拼正文 → 交给 ask → 拆气泡发回去。
 * 这里不碰 WebSocket 也不碰 NapCat，发和问都由外面传进来，方便单测。
 *
 * ask(key, text) -> Promise<{ ok, text, error }>
 * send({ kind, userId, groupId, text }) -> Promise<void>
 */
export function createRouter({ config, ask, send, forget = async () => null, log = () => {}, now = () => Date.now(), today = () => new Date() }) {
  const seen = new Map() // 群号 -> 最近一次有人说话的时间
  const firstSeen = new Map() // 群号 -> 第一次见到它的时间
  const lastScan = new Map() // 群号 -> 上次到点自看的时间（看过才写）

  const quiet = () => (Array.isArray(config.quietWords) ? config.quietWords : ['SILENT'])
  const owner = Number(config.ownerQQ) || 0
  const whitelist = (config.whitelist ?? []).map(Number).filter(Boolean)
  const logDir = config.logDir || ''

  function writeDaily(kind, line) {
    if (kind === 'private' && config.logPrivate === false) return
    if (kind === 'group' && config.logGroup === false) return
    appendDaily({ dir: logDir, kind, day: today(), line })
  }

  function groupTail(groupId, lines) {
    return tailDaily({
      dir: logDir,
      kind: 'group',
      day: today(),
      lines,
      filter: (line) => line.includes(`群${groupId} `),
    })
  }

  async function deliver(key, reply, target) {
    if (isQuiet(reply, quiet())) {
      log('这轮不回', key)
      return
    }
    const bubbles = splitBubbles(reply, config.maxBubbles ?? 4)
    const gap = Number(config.bubbleGapMs ?? 4000)
    for (const [index, bubble] of bubbles.entries()) {
      await send({ ...target, text: bubble })
      if (target.kind === 'group') writeDaily('group', `[${clock(now())}] 群${target.groupId} ${config.ownerName || '机器人'}：${bubble}`)
      else writeDaily('private', `[${clock(now())}] ${config.ownerName || '机器人'}：${bubble}`)
      if (index < bubbles.length - 1) await new Promise((resolve) => setTimeout(resolve, gap))
    }
  }

  async function handle(packet) {
    const isGroup = packet.message_type === 'group'
    const key = isGroup ? `group:${packet.group_id}` : `private:${packet.user_id}`
    const userId = Number(packet.user_id)
    const timeMs = Number(packet.time) * 1000 || now()
    const { plain, images } = readMessage(packet.message)
    const atMe = (packet.message ?? []).some((seg) => seg?.type === 'at' && Number(seg.data?.qq) === Number(config.botQQ))
    const name = packet.sender?.card || packet.sender?.nickname || String(userId)
    const shown = plain || (images.length ? `[图 ${images.length} 张]` : '')

    if (isGroup) {
      const gid = String(packet.group_id)
      if (shown) writeDaily('group', `[${clock(timeMs)}] 群${gid} ${name}：${shown}`)
      if (!firstSeen.has(gid)) firstSeen.set(gid, now())
      seen.set(gid, now())

      const push = shouldPush({
        atMe,
        text: plain,
        userId,
        whitelist,
        keywords: config.keywords ?? [],
        watchAll: config.watchAllGroups === true,
        ownerQQ: owner,
      })
      if (!push) {
        log('群消息不递', gid, name)
        return
      }
    } else {
      if (!privateAllowed(userId, { ownerQQ: owner, whitelist, replyStrangers: config.replyStrangers === true })) {
        log('陌生人私聊，不理', userId)
        return
      }
      if (plain.trim() === '/new' || plain.trim() === '/新') {
        const dropped = await forget(key)
        log('换了新会话', key, dropped ?? '(none)')
        await send({ kind: 'private', userId, text: '换了个新会话，前面的不带了。' })
        return
      }
      if (shown) writeDaily('private', `[${clock(timeMs)}] ${config.ownerName || '主人'}：${shown}`)
    }

    if (!shown) {
      log('空消息，跳过', key)
      return
    }

    let body = isGroup
      ? groupBody(plain || `[图 ${images.length} 张]`, {
        timeMs,
        name,
        userId,
        groupId: packet.group_id,
        atMe,
        prefix: config.groupPrefix !== false,
      })
      : privateBody(plain || `[图 ${images.length} 张]`, timeMs, { timePrefix: config.privateTimePrefix !== false })

    if (images.length) body = `${body}\n[图: ${images.join(' ')}]`

    const contextLines = Number(config.groupContextLines ?? 0)
    if (isGroup && contextLines > 0) {
      const recent = groupTail(packet.group_id, contextLines)
      if (recent.length) body = `[这个群最近说过的话，接话前先看一眼]\n${recent.join('\n')}\n---\n${body}`
    }

    log('收到', isGroup ? `群 ${packet.group_id}` : `私聊 ${userId}`, JSON.stringify(plain || ''), images.length ? `图 ${images.length} 张` : '')

    let reply = ''
    try {
      const result = await ask(key, body)
      if (result?.ok) reply = result.text ?? ''
      else {
        log('递话失败', result?.error)
        return
      }
    } catch (err) {
      log('递话失败', err?.message ?? err)
      return
    }
    if (!reply.trim()) {
      log('这一轮没说出话', key)
      return
    }
    await deliver(key, reply, isGroup ? { kind: 'group', groupId: packet.group_id } : { kind: 'private', userId })
  }

  /** 到点自看：把某群最近的记录递一次 */
  async function scanGroup(groupId) {
    const gid = String(groupId)
    const lines = Number(config.groupScanLines ?? 20)
    const recent = groupTail(gid, lines)
    if (!recent.length) return
    const body = `[到点看看群，接不接你自己定，不想接只回 ${quiet()[0]}]（群 ${gid}）\n${recent.join('\n')}`
    log('到点看群', gid, recent.length, '行')
    let reply = ''
    try {
      const result = await ask(`group:${gid}`, body)
      if (result?.ok) reply = result.text ?? ''
    } catch (err) {
      log('到点看群失败', err?.message ?? err)
      return
    }
    if (!reply.trim()) return
    await deliver(`group:${gid}`, reply, { kind: 'group', groupId })
  }

  /** 哪些群该看了 */
  function dueGroups() {
    const interval = Number(config.groupScanIntervalMs ?? 0)
    if (!(interval > 0)) return []
    const due = []
    for (const [gid, spokenAt] of seen) {
      // 七天没动静的群就别留着了，不然表只长不缩
      if (now() - spokenAt > 7 * 24 * 60 * 60 * 1000) {
        seen.delete(gid)
        firstSeen.delete(gid)
        lastScan.delete(gid)
        continue
      }
      const scanned = lastScan.get(gid)
      if (scanned === undefined) {
        // 还没看过：从第一次见到这个群算起，够一个间隔就端一次
        if (now() - (firstSeen.get(gid) ?? spokenAt) < interval) continue
      } else {
        if (now() - scanned < interval) continue
        // 上次看过之后一直没人说话，就不端了
        if (spokenAt <= scanned) continue
      }
      lastScan.set(gid, now())
      due.push(gid)
    }
    return due
  }

  return { handle, scanGroup, dueGroups }
}