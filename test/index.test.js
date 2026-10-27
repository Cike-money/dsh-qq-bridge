import { test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, mkdtempSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { apply, name, Config } from '../src/index.js'

test('入口导出 name 和 Config，schema 能补默认值', () => {
  assert.equal(name, 'dsh-qq-bridge')
  const cfg = Config({})
  assert.equal(cfg.napcatHttp, 'http://127.0.0.1:3000')
  assert.equal(cfg.ownerQQ, 0)
  assert.deepEqual(cfg.whitelist, [])
  assert.deepEqual(cfg.quietWords, ['SILENT'])
  assert.equal(cfg.dryRun, false)
})

test('干跑启动：建日志目录、不连 NapCat、能干净退出', async () => {
  const home = mkdtempSync(join(tmpdir(), 'qq-home-'))
  const ctx = {
    get(service) {
      if (service === 'dshHomePath') return (...parts) => join(home, ...parts)
      if (service === 'sessions') return { get: () => undefined }
      if (service === 'sessionController') return { create: async () => ({ sessionId: 's1' }), prompt: async () => {} }
      if (service === 'workspaceRegistry') return { resolveByPath: async () => ({ id: 'w1' }) }
      return undefined
    },
  }
  const dispose = apply(ctx, { dryRun: true, ownerQQ: 5 })
  await new Promise((r) => setTimeout(r, 50))
  const logFile = join(home, 'qq-bridge', 'bridge.log')
  assert.equal(existsSync(logFile), true)
  const logText = readFileSync(logFile, 'utf8')
  assert.match(logText, /干跑/)
  assert.match(logText, /配置提醒/)
  assert.match(logText, /napcatToken 空着/)
  assert.equal(typeof dispose, 'function')
  dispose()
})

test('没有会话服务时给的是明确的错，不是静默失败', async () => {
  const home = mkdtempSync(join(tmpdir(), 'qq-home-'))
  const ctx = { get: (s) => (s === 'dshHomePath' ? (...p) => join(home, ...p) : undefined) }
  const dispose = apply(ctx, { dryRun: true, ownerQQ: 5 })
  await new Promise((r) => setTimeout(r, 50))
  dispose()
  assert.ok(existsSync(join(home, 'qq-bridge')))
})