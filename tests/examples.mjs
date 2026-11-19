import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const curriculum = JSON.parse(readFileSync(new URL('../src/data/courses.json', import.meta.url), 'utf8'))
const requestedModule = process.argv[2]
const modules = curriculum.modules.filter(module => !requestedModule || String(module.id) === requestedModule)
assert(modules.length, `未知模块 ${requestedModule}`)

const compiler = process.env.CC || 'cc'
const work = mkdtempSync(join(tmpdir(), 'c-skeleton-examples-'))
const source = join(work, 'example.c')
const executable = join(work, process.platform === 'win32' ? 'example.exe' : 'example')

function run(command, args, label, input, timeout) {
  const result = spawnSync(command, args, { cwd: work, encoding: 'utf8', input, timeout })
  if (result.error) throw new Error(`${label} · ${command} · ${result.error.message}`)
  assert.equal(result.status, 0, `${label} · ${command} · ${result.signal ?? result.stderr}`)
  return result.stdout
}

try {
  let total = 0
  for (const module of modules) {
    let programs = 0
    let snippets = 0
    for (const lesson of module.lessons) {
      for (const [name, example] of Object.entries({ core: lesson.example, deep: lesson.deepExample })) {
        if (example.kind === 'snippet') {
          snippets++
          continue
        }
        const label = `Module ${module.id} · ${lesson.id} · ${name}`
        writeFileSync(source, example.code + '\n')
        run(compiler, ['-std=c11', '-Wall', '-Wextra', '-Wpedantic', '-Werror', source, '-o', executable], label, undefined, 15_000)
        const output = run(executable, [], label, example.input ?? '', 5_000).replace(/\r\n/g, '\n').replace(/\n$/, '')
        assert.equal(output, example.output, `${label} · 输出不符`)
        programs++
      }
    }
    if (module.lessons.length) console.log(`Module ${module.id} · ${programs} 个完整程序编译并核对输出 · ${snippets} 个标注片段`)
    total += programs
  }
  assert(total > 0, '没有可执行的完整示例')
  console.log(`共验证 ${total} 个完整程序`)
} finally {
  rmSync(work, { recursive: true, force: true })
}
