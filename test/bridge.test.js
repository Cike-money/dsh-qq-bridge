import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createBridge } from '../src/bridge.js'
import { createRouter } from '../src/router.js'

const at = (h, m) => Math.floor(new Date(2026, 0, 2, h, m, 0).getTime() / 1000)

class FakeWS {
  static all = []
  constructor(url) {
    this.url = url
    this.listeners = {}
    FakeWS.all.push(this)
  }
  addEventListener(type, fn) {
    ;(this.listeners[type] ||= []).push(fn)
  }
  close() {}
  emit(type, data) {
    for (const fn of this.listeners[type] ?? []) fn({ data: JSON.stringify(data) })
  }
}

test('整条链路：假 NapCat → 路由 → 假会话 → 发回 NapCat', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'qq-bridge-'))
  const posts = []
  const fetchImpl = async (url, opts = {}) => {
    posts.push({ url: String(url), body: opts.body ? JSON.parse(opts.body) : null })
    if (String(url).endsWith('/get_login_info')) {
      return { ok: true, json: async () => ({ data: { user_id: 9, nickname: '鲸小满' } }) }
    }
    return { ok: true, json: async () => ({ ok: true, data: { message_id: 1 } }) }
  }

  const config = {
    napcatHttp: 'http://127.0.0.1:3000',
    napcatWs: 'ws://127.0.0.1:3001',
    napcatToken: 't',
    ownerQQ: 5,
    ownerName: '老板',
    whitelist: [],
    keywords: [],
    watchAllGroups: false,
    replyStrangers: false,
    privateTimePrefix: true,
    groupPrefix: true,
    quietWords: ['SILENT'],
    maxBubbles: 4,
    bubbleGapMs: 0,
    groupContextLines: 0,
    groupScanIntervalMs: 0,
    logDir: dir,
    logPrivate: true,
    logGroup: true,
    dryRun: false,
    botQQ: 0,
  }

  const asked = []
  const bridge = createBridge({ config, log: () => {}, fetchImpl, WebSocketImpl: FakeWS })
  const router = createRouter({
    config,
    ask: async (key, text) => {
      asked.push({ key, text })
      return { ok: true, text: '在呢\n怎么了' }
    },
    send: (m) => bridge.send(m),
    log: () => {},
  })
  bridge.setRouter(router)

  await bridge.start()
  assert.equal(config.botQQ, 9)

  const ws = FakeWS.all.at(-1)
  ws.emit('message', {
    post_type: 'message',
    message_type: 'private',
    user_id: 5,
    time: at(8, 3),
    sender: {},
    message: [{ type: 'text', data: { text: '在吗' } }],
  })
  await new Promise((r) => setTimeout(r, 50))

  assert.equal(asked[0].text, '[08:03] 在吗')
  const sends = posts.filter((p) => p.url.endsWith('/send_private_msg'))
  assert.deepEqual(sends.map((p) => p.body.message[0].data.text), ['在呢', '怎么了'])
  assert.equal(sends[0].body.user_id, 5)

  ws.emit('message', {
    post_type: 'message',
    message_type: 'private',
    user_id: 9,
    time: at(8, 4),
    sender: {},
    message: [{ type: 'text', data: { text: '自己说的话' } }],
  })
  await new Promise((r) => setTimeout(r, 20))
  assert.equal(asked.length, 1)
  bridge.stop()
})

test('干跑不连也不发', async () => {
  const posts = []
  const fetchImpl = async (url) => {
    posts.push(String(url))
    return { ok: true, json: async () => ({}) }
  }
  const config = { napcatHttp: 'http://x', napcatWs: 'ws://x', napcatToken: '', dryRun: true, logDir: '', quietWords: ['SILENT'], maxBubbles: 4, bubbleGapMs: 0 }
  const bridge = createBridge({ config, log: () => {}, fetchImpl, WebSocketImpl: FakeWS })
  await bridge.start()
  await bridge.send({ kind: 'group', groupId: 1, text: 'hi' })
  assert.equal(posts.length, 0)
  bridge.stop()
})