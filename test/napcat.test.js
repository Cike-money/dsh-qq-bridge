import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { findNapCat, napCatRoot, readOnebotConfig } from '../src/napcat.js'

test('在指定目录里认出 NapCat 的启动文件', () => {
  const dir = mkdtempSync(join(tmpdir(), 'napcat-'))
  writeFileSync(join(dir, 'NapCatWinBootMain.exe'), '')
  assert.equal(findNapCat(dir), join(dir, 'NapCatWinBootMain.exe'))
})

test('翻一层子目录也认', () => {
  const dir = mkdtempSync(join(tmpdir(), 'napcat-'))
  const sub = join(dir, 'shell')
  mkdirSync(sub)
  writeFileSync(join(sub, 'napcat.bat'), '')
  assert.equal(findNapCat(dir), join(sub, 'napcat.bat'))
})

test('目录里没有启动文件时，不会把 readme 之类当成 NapCat', () => {
  const dir = mkdtempSync(join(tmpdir(), 'napcat-'))
  writeFileSync(join(dir, 'readme.txt'), '')
  const hit = findNapCat(dir)
  assert.equal(hit.startsWith(dir), false)
})
test('从 NapCat 的 onebot 配置里读出端口和口令', () => {
  const root = mkdtempSync(join(tmpdir(), 'napcat-'))
  mkdirSync(join(root, 'config'))
  writeFileSync(join(root, 'package.json'), '{}')
  writeFileSync(join(root, 'config', 'onebot11_10001.json'), JSON.stringify({
    network: {
      httpServers: [{ enable: true, host: '127.0.0.1', port: 3000, token: 'tk' }],
      websocketServers: [{ enable: true, host: '127.0.0.1', port: 3001, token: 'tk' }],
    },
  }))
  const found = readOnebotConfig(root)
  assert.equal(found.http.port, 3000)
  assert.equal(found.ws.port, 3001)
  assert.equal(found.http.token, 'tk')
  assert.equal(napCatRoot(join(root, 'shell', 'launcher.bat')), join(root, 'shell').replace(/\\shell$/, ''))
})

test('没有配置就返回 null，不抛错', () => {
  const root = mkdtempSync(join(tmpdir(), 'napcat-'))
  assert.equal(readOnebotConfig(root), null)
})