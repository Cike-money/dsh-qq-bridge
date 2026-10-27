import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, readdirSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createRouter } from '../src/router.js'

const at = (h, m) => Math.floor(new Date(2026, 0, 2, h, m, 0).getTime() / 1000)

function setup(overrides = {}, replies = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'qq-bridge-'))
  const asked = []
  const sent = []
  const config = {
    ownerQQ: 5,
    ownerName: '老板',
    whitelist: [7],
    keywords: ['小满'],
    atMe: true,
    watchAllGroups: false,
    replyStrangers: false,
    privateTimePrefix: true,
    groupPrefix: true,
    quietWords: ['SILENT'],
    maxBubbles: 4,
    bubbleGapMs: 0,
    groupContextLines: 2,
    groupScanLines: 20,
    groupScanIntervalMs: 0,
    logDir: dir,
    logPrivate: true,
    logGroup: true,
    botQQ: 9,
    dryRun: false,
    ...overrides,
  }
  let nowMs = at(10, 0) * 1000
  const router = createRouter({
    config,
    ask: async (key, text) => {
      asked.push({ key, text })
      return replies[key] ?? { ok: true, text: '在呢' }
    },
    send: async (m) => {
      sent.push(m)
    },
    forget: async (key) => key,
    log: () => {},
    now: () => nowMs,
    today: () => new Date(2026, 0, 2, 10, 0, 0),
  })
  return { dir, asked, sent, router, config, advance: (ms) => { nowMs += ms } }
}

const gp = (over = {}) => ({
  post_type: 'message',
  message_type: 'group',
  group_id: 456,
  user_id: 100,
  time: at(10, 7),
  sender: { card: '小明', nickname: '小明' },
  message: [{ type: 'text', data: { text: '随便聊聊' } }],
  ...over,
})

const pp = (over = {}) => ({
  post_type: 'message',
  message_type: 'private',
  user_id: 5,
  time: at(8, 3),
  sender: {},
  message: [{ type: 'text', data: { text: '在吗' } }],
  ...over,
})

test('群里不点名的消息不递，但落群聊流水', async () => {
  const { router, asked, dir } = setup()
  await router.handle(gp())
  assert.equal(asked.length, 0)
  const files = readdirSync(dir).filter((f) => f.startsWith('group-'))
  assert.equal(files.length, 1)
  const text = readFileSync(join(dir, files[0]), 'utf8')
  assert.match(text, /\[10:07\] 群456 小明：随便聊聊/)
})

test('关键词命中就递，带群前缀和背景', async () => {
  const { router, asked } = setup()
  await router.handle(gp({ message: [{ type: 'text', data: { text: '小满在吗' } }] }))
  assert.equal(asked.length, 1)
  assert.equal(asked[0].key, 'group:456')
  assert.match(asked[0].text, /\[10:07 小明\(100\)\] 小满在吗（群 456）/)
})

test('@ 机器人算点名', async () => {
  const { router, asked } = setup()
  await router.handle(gp({ message: [{ type: 'at', data: { qq: '9' } }, { type: 'text', data: { text: ' 看看' } }] }))
  assert.equal(asked.length, 1)
  assert.match(asked[0].text, /\[@我\]/)
})

test('私聊主人带时间前缀，流水记原话', async () => {
  const { router, asked, dir } = setup()
  await router.handle(pp())
  assert.equal(asked[0].text, '[08:03] 在吗')
  const file = readdirSync(dir).find((f) => f.startsWith('private-'))
  assert.match(readFileSync(join(dir, file), 'utf8'), /\[08:03\] 老板：在吗/)
})

test('陌生人不回', async () => {
  const { router, asked } = setup()
  await router.handle(pp({ user_id: 8 }))
  assert.equal(asked.length, 0)
})

test('回 SILENT 不发，多行按 bubble 发', async () => {
  const a = setup({}, { 'private:5': { ok: true, text: 'SILENT' } })
  await a.router.handle(pp())
  assert.equal(a.sent.length, 0)

  const b = setup({}, { 'private:5': { ok: true, text: '一\n二\n三' } })
  await b.router.handle(pp())
  assert.deepEqual(b.sent.map((m) => m.text), ['一', '二', '三'])
  assert.equal(b.sent.every((m) => m.kind === 'private'), true)
})

test('到点自看只在该看的时候触发', async () => {
  const { router, asked, advance } = setup({ groupScanIntervalMs: 60000, groupScanLines: 5 })
  await router.handle(gp())
  assert.deepEqual(router.dueGroups(), [])
  advance(61000)
  const due = router.dueGroups()
  assert.deepEqual(due, ['456'])
  await router.scanGroup(due[0])
  assert.match(asked.at(-1).text, /^\[到点看看群/)
  assert.deepEqual(router.dueGroups(), [])
})