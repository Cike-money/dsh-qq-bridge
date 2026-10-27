import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { appendDaily, localDate, tailDaily } from '../src/log.js'

test('按天一个文件，表头只写一次', () => {
  const dir = mkdtempSync(join(tmpdir(), 'log-'))
  const day = new Date(2026, 0, 2, 9, 0, 0)
  appendDaily({ dir, kind: 'private', day, line: '[09:00] 老板：早' })
  appendDaily({ dir, kind: 'private', day, line: '[09:01] 机器人：早' })
  const text = readFileSync(join(dir, 'private-2026-01-02.md'), 'utf8')
  assert.equal(text.split('# 2026-01-02').length, 2)
  assert.match(text, /\[09:00\] 老板：早/)
  assert.match(text, /星期五/)
})

test('tailDaily 只取最后几行，能过滤', () => {
  const dir = mkdtempSync(join(tmpdir(), 'log-'))
  const day = new Date(2026, 0, 2, 9, 0, 0)
  for (let i = 0; i < 12; i++) {
    appendDaily({ dir, kind: 'group', day, line: `[09:${String(i).padStart(2, '0')}] 群1 甲：第${i}句` })
  }
  appendDaily({ dir, kind: 'group', day, line: '[09:59] 群2 乙：别的群' })
  const last = tailDaily({ dir, kind: 'group', day, lines: 3, filter: (l) => l.includes('群1 ') })
  assert.equal(last.length, 3)
  assert.match(last.at(-1), /第11句/)
})

test('本地日期不跟着 UTC 跑', () => {
  assert.equal(localDate(new Date(2026, 9, 25, 0, 30)), '2026-10-25')
})