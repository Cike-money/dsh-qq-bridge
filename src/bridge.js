/**
 * QQ 那一侧：连 NapCat 的 WebSocket、调它的 HTTP 接口、把包交给 router、跑定时自看。
 * 连不上就退避重连；NapCat 没起来时可以按配置去拉起（默认关）。
 */
export function createBridge({ config, router = null, log = () => {}, fetchImpl = globalThis.fetch, WebSocketImpl = globalThis.WebSocket, timers = globalThis }) {
  // 路由对象要在桥之后建（它俩互相用），所以留一个 setter
  let current = router
  const setRouter = (next) => {
    current = next
  }
  const queue = { promise: Promise.resolve() }
  const enqueue = (task) => {
    queue.promise = queue.promise.then(task).catch((err) => log('task failed', err?.message ?? err))
    return queue.promise
  }

  async function api(action, params) {
    const res = await fetchImpl(`${config.napcatHttp}/${action}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${config.napcatToken ?? ''}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(params ?? {}),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status} on ${action}`)
    return res.json()
  }

  const text = (s) => [{ type: 'text', data: { text: s } }]

  async function send({ kind, userId, groupId, text: body }) {
    if (config.dryRun === true) {
      log('干跑：不发送', kind, groupId ?? userId, body)
      return
    }
    if (kind === 'group') await api('send_group_msg', { group_id: groupId, message: text(body) })
    else await api('send_private_msg', { user_id: userId, message: text(body) })
  }


  let ws
  let closed = false
  let retry = 0
  let scanTimer

  function connect() {
    if (closed || config.dryRun === true) return
    if (!WebSocketImpl) {
      log('这个 Node 没有 WebSocket，连不了 NapCat')
      return
    }
    ws = new WebSocketImpl(`${config.napcatWs}/?access_token=${encodeURIComponent(config.napcatToken ?? '')}`)
    ws.addEventListener('open', () => {
      retry = 0
      log('ws open', config.napcatWs)
      void refreshBot()
    })
    ws.addEventListener('message', (event) => {
      let packet
      try {
        packet = JSON.parse(String(event.data))
      } catch {
        return
      }
      if (packet.post_type === 'meta_event') {
        if (packet.meta_event_type === 'lifecycle') log('lifecycle', packet.sub_type)
        return
      }
      if (packet.post_type !== 'message') return
      if (Number(packet.user_id) === Number(config.botQQ)) return
      enqueue(() => current.handle(packet))
    })
    ws.addEventListener('close', () => {
      if (closed) return
      const delay = Math.min(30000, 1000 * 2 ** retry++)
      log('ws closed, retry in', delay)
      timers.setTimeout(connect, delay)
    })
    ws.addEventListener('error', () => log('ws error'))
  }

  function startScan() {
    const interval = Number(config.groupScanIntervalMs ?? 0)
    if (!(interval > 0)) return
    scanTimer = timers.setInterval(() => {
      for (const gid of current?.dueGroups?.() ?? []) enqueue(() => current.scanGroup(gid))
    }, Math.min(20000, Math.max(1000, interval / 2)))
  }

  async function napcatUp() {
    if (config.dryRun === true) return true
    try {
      const res = await fetchImpl(`${config.napcatHttp}/get_login_info`, {
        headers: { Authorization: `Bearer ${config.napcatToken ?? ''}` },
        signal: AbortSignal.timeout(3000),
      })
      return res.ok
    } catch {
      return false
    }
  }

  /** 取一次登录信息，知道机器人自己的 QQ（@ 判断要用） */
  async function refreshBot() {
    if (config.dryRun === true) return
    try {
      const info = await api('get_login_info', {})
      const uid = info?.data?.user_id
      if (uid) {
        config.botQQ = Number(uid)
        log('登录账号', uid, info?.data?.nickname ?? '')
      }
    } catch (err) {
      log('拿登录信息失败', err?.message)
    }
  }

  /**
   * 开始连：NapCat 没起来就按配置拉起，然后照样连 —— 连不上会自己退避重试，
   * 这样 NapCat 晚点起来也不用重开 DSH。
   */
  async function start() {
    if (config.dryRun === true) {
      log('干跑模式：不连 NapCat')
      return
    }
    if (await napcatUp()) await refreshBot()
    else {
      log('NapCat 没应声', config.napcatHttp)
      if (config.autoStartNapCat === true && config.napcatStartCommand) {
        try {
          const { exec } = await import('node:child_process')
          exec(config.napcatStartCommand, { windowsHide: true }, () => {})
          log('按配置拉起 NapCat', config.napcatStartCommand)
        } catch (err) {
          log('拉起 NapCat 失败', err?.message)
        }
      } else {
        log('没开自动拉起，先自己把 NapCat 起起来；这边会一直重试')
      }
    }
    connect()
    startScan()
  }

  function stop() {
    closed = true
    if (scanTimer) timers.clearInterval(scanTimer)
    try {
      ws?.close()
    } catch {}
  }

  return { start, stop, api, send, napcatUp, setRouter }
}