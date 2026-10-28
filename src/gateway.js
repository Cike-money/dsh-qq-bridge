import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'

/**
 * 会话网关：把 QQ 的一个会话（private:<qq> / group:<群号>）对到 DSH 的一个会话上，
 * 递一句话进去、等这一轮跑完、把助手说的话取回来。
 *
 * 用的是宿主服务 sessionController / sessions / workspaceRegistry；
 * 拿不到就明确报错，不装作能跑。
 */
export function createGateway({ ctx, cwd, statePath, pollMs = 250, timeoutMs = 600000, log = () => {} }) {
  const sessions = loadState(statePath)
  const save = () => {
    try {
      mkdirSync(dirname(statePath), { recursive: true })
      writeFileSync(statePath, JSON.stringify(sessions, null, 2))
    } catch (err) {
      log('保存会话映射失败', err?.message)
    }
  }

  const live = (id) => ctx.get('sessions')?.get(id)
  const events = (id) => live(id)?.snapshotEvents?.(0)

  function assistantText(list, afterSeq) {
    const out = []
    for (const event of list ?? []) {
      if (event.seq <= afterSeq) continue
      if (event.type !== 'assistant/message') continue
      for (const block of event.data?.message?.content ?? []) {
        if (block?.type === 'text' && block.text) out.push(block.text)
      }
    }
    return out.join('\n').trim()
  }

  const turnFinished = (list, afterSeq) => (list ?? []).some((e) => e.seq > afterSeq && e.type === 'turn/end')

  async function ensure(key) {
    const known = sessions[key]
    if (known && live(known)) return known
    const sc = ctx.get('sessionController')
    if (!sc?.create) throw new Error('拿不到 sessionController，这个版本的 DSH 可能不支持把消息塞进会话')
    let workspaceId
    try {
      workspaceId = (await ctx.get('workspaceRegistry')?.resolveByPath?.(cwd))?.id
    } catch {}
    const created = workspaceId ? await sc.create({ workspaceId }) : await sc.create({ cwd })
    sessions[key] = created.sessionId
    save()
    log('建了会话', created.sessionId, '给', key)
    return created.sessionId
  }

  async function prompt(key, text) {
    if (!ctx.get('sessions')?.get) throw new Error('拿不到 sessions 服务，没法读会话进度')
    const sessionId = await ensure(key)
    const before = events(sessionId)?.at(-1)?.seq ?? 0
    const sc = ctx.get('sessionController')
    await sc.prompt(
      {
        requestId: `qq-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        sessionId,
        mode: 'queue',
        content: [{ type: 'text', text }],
        clientTimeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
      new AbortController().signal,
    )
    const deadline = Date.now() + timeoutMs
    while (Date.now() < deadline) {
      const list = events(sessionId)
      if (list && turnFinished(list, before)) return { ok: true, text: assistantText(list, before) }
      await new Promise((resolve) => setTimeout(resolve, pollMs))
    }
    return { ok: false, error: '这一轮等超时了' }
  }

  function forget(key) {
    const old = sessions[key]
    delete sessions[key]
    save()
    return old ?? null
  }

  function list() {
    return { ...sessions }
  }

  return { prompt, forget, list }
}

function loadState(path) {
  try {
    if (!path || !existsSync(path)) return {}
    return JSON.parse(readFileSync(path, 'utf8'))
  } catch {
    return {}
  }
}