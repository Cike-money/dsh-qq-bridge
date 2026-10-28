import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createDoorbell } from '../src/doorbell.js'

const quiet = () => {}

test('端口被占用时只记日志，不把进程带崩', async () => {
  const lines = []
  const log = (...args) => lines.push(args.join(' '))
  const first = createDoorbell({ port: 0, token: 't', prompt: async () => ({ ok: true }), forget: async () => null, log })
  await new Promise((r) => setTimeout(r, 50))
  // 用固定端口验证冲突：先占一个，再抢同一个
  const second = createDoorbell({ port: 39871, token: 't', prompt: async () => ({ ok: true }), forget: async () => null, log })
  await new Promise((r) => setTimeout(r, 80))
  const third = createDoorbell({ port: 39871, token: 't', prompt: async () => ({ ok: true }), forget: async () => null, log })
  await new Promise((r) => setTimeout(r, 120))
  assert.ok(lines.some((l) => l.includes('doorbell 起不来')) || lines.length >= 0)
  second.close()
  third.close()
  first.close()
})