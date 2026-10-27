import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createGateway } from '../src/gateway.js'

/** 假的宿主：一个会话控制器 + 一个会话表，够 gateway 用 */
function fakeCtx({ autoReply = '在呢', hang = false } = {}) {
  const store = new Map()
  let seq = 0
  const ctx = {
    get(service) {
      if (service === 'sessions') return { get: (id) => store.get(id) }
      if (service === 'workspaceRegistry') return { resolveByPath: async () => ({ id: 'w1' }) }
      if (service === 'sessionController') {
        return {
          create: async () => {
            const id = `s${store.size + 1}`
            const events = []
            store.set(id, { snapshotEvents: () => events })
            return { sessionId: id }
          },
          prompt: async ({ sessionId, content }) => {
            const events = store.get(sessionId).snapshotEvents()
            events.push({ seq: ++seq, type: 'user/message', data: { content } })
            if (hang) return
            events.push({ seq: ++seq, type: 'assistant/message', data: { message: { content: [{ type: 'text', text: autoReply }] } } })
            events.push({ seq: ++seq, type: 'turn/end', data: { reason: 'done' } })
          },
        }
      }
      return undefined
    },
  }
  return { ctx, store }
}

test('递一句话进去、等这一轮结束、拿回助手说的话', async () => {
  const { ctx, store } = fakeCtx({ autoReply: '在呢，怎么了' })
  const state = join(mkdtempSync(join(tmpdir(), 'gw-')), 'sessions.json')
  const gw = createGateway({ ctx, cwd: 'C:\\tmp', statePath: state, pollMs: 5, timeoutMs: 2000 })
  const result = await gw.prompt('private:5', '[08:03] 在吗')
  assert.equal(result.ok, true)
  assert.equal(result.text, '在呢，怎么了')
  assert.equal(store.size, 1)
  assert.deepEqual(gw.list(), { 'private:5': 's1' })
  assert.equal(JSON.parse(readFileSync(state, 'utf8'))['private:5'], 's1')
})

test('同一个 key 复用同一个会话，不同 key 各开一个', async () => {
  const { ctx, store } = fakeCtx()
  const gw = createGateway({ ctx, cwd: 'C:\\tmp', statePath: join(mkdtempSync(join(tmpdir(), 'gw-')), 's.json'), pollMs: 5, timeoutMs: 1000 })
  await gw.prompt('private:5', '一')
  await gw.prompt('private:5', '二')
  await gw.prompt('group:456', '三')
  assert.equal(store.size, 2)
  assert.equal(Object.keys(gw.list()).length, 2)
})

test('/new 把映射丢掉，下次重新建', async () => {
  const { ctx, store } = fakeCtx()
  const gw = createGateway({ ctx, cwd: 'C:\\tmp', statePath: join(mkdtempSync(join(tmpdir(), 'gw-')), 's.json'), pollMs: 5, timeoutMs: 1000 })
  await gw.prompt('private:5', '一')
  assert.equal(gw.forget('private:5'), 's1')
  assert.equal(Object.keys(gw.list()).length, 0)
  await gw.prompt('private:5', '二')
  assert.equal(store.size, 2)
})

test('等不到 turn/end 就超时报错，不装没事', async () => {
  const { ctx } = fakeCtx({ hang: true })
  const gw = createGateway({ ctx, cwd: 'C:\\tmp', statePath: join(mkdtempSync(join(tmpdir(), 'gw-')), 's.json'), pollMs: 5, timeoutMs: 60 })
  const result = await gw.prompt('private:5', '有人在吗')
  assert.equal(result.ok, false)
  assert.match(result.error, /超时/)
})

test('没有 sessionController 时报明确的错', async () => {
  const ctx = { get: () => undefined }
  const gw = createGateway({ ctx, cwd: 'C:\\tmp', statePath: join(mkdtempSync(join(tmpdir(), 'gw-')), 's.json') })
  await assert.rejects(() => gw.prompt('private:5', 'hi'), /sessionController/)
})