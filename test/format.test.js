import { test } from 'node:test'
import assert from 'node:assert/strict'
import { clock, privateBody, groupBody, isQuiet, splitBubbles, shouldPush, privateAllowed, readMessage } from '../src/format.js'

const at = (h, m) => new Date(2026, 0, 2, h, m, 0).getTime()

test('clock 用本地时区补零', () => {
  assert.equal(clock(at(9, 5)), '09:05')
  assert.equal(clock(at(23, 59)), '23:59')
})

test('私聊正文默认带 [HH:MM]', () => {
  assert.equal(privateBody('在吗', at(8, 3)), '[08:03] 在吗')
  assert.equal(privateBody('在吗', at(8, 3), { timePrefix: false }), '在吗')
  assert.equal(privateBody('   ', at(8, 3)), '')
})

test('群聊正文带昵称和 QQ，@我 加标记', () => {
  assert.equal(
    groupBody('看这个', { timeMs: at(10, 7), name: '小明', userId: 123, groupId: 456, atMe: true }),
    '[10:07 小明(123)] [@我] 看这个（群 456）',
  )
  assert.equal(groupBody('看这个', { timeMs: at(10, 7), name: '小明', userId: 123, groupId: 456 }), '[10:07 小明(123)] 看这个（群 456）')
  assert.equal(groupBody('看这个', { timeMs: at(10, 7), name: '小明', userId: 123, groupId: 456, prefix: false }), '看这个（群 456）')
})

test('静默词不区分大小写，空回复也算静默', () => {
  assert.equal(isQuiet('SILENT'), true)
  assert.equal(isQuiet('silent'), true)
  assert.equal(isQuiet('  SILENT  '), true)
  assert.equal(isQuiet('（沉默）', ['SILENT', '（沉默）']), true)
  assert.equal(isQuiet('', ['SILENT']), true)
  assert.equal(isQuiet('不，我要说'), false)
})

test('分气泡按行切、去零宽、限行数', () => {
  assert.deepEqual(splitBubbles('一\n二\n\u200b\n三', 2), ['一', '二'])
  assert.deepEqual(splitBubbles('单句', 4), ['单句'])
  assert.deepEqual(splitBubbles('', 4), [])
})

test('群里只有 @、关键词、名单、全量才推', () => {
  const base = { userId: 9, whitelist: [7], keywords: ['小满'], ownerQQ: 5 }
  assert.equal(shouldPush({ ...base, atMe: true, text: '' }), true)
  assert.equal(shouldPush({ ...base, text: '小满在吗' }), true)
  assert.equal(shouldPush({ ...base, text: '随便聊聊' }), false)
  assert.equal(shouldPush({ ...base, text: '我来了', userId: 7 }), true)
  assert.equal(shouldPush({ ...base, text: '我来了', userId: 5 }), true)
  assert.equal(shouldPush({ ...base, text: '随便聊聊', watchAll: true }), true)
  assert.equal(shouldPush({ ...base, text: '小满', keywords: [] }), false)
})

test('私聊默认只回主人和名单', () => {
  const cfg = { ownerQQ: 5, whitelist: [7] }
  assert.equal(privateAllowed(5, cfg), true)
  assert.equal(privateAllowed(7, cfg), true)
  assert.equal(privateAllowed(8, cfg), false)
  assert.equal(privateAllowed(8, { ...cfg, replyStrangers: true }), true)
})

test('readMessage 拼文本、收图、认 @', () => {
  const r = readMessage([
    { type: 'at', data: { qq: '1' } },
    { type: 'text', data: { text: ' 你好' } },
    { type: 'image', data: { url: 'http://x/1.png' } },
  ])
  assert.equal(r.plain, '@1 你好')
  assert.deepEqual(r.images, ['http://x/1.png'])
})