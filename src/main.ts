import './styles.css'
import { version } from '../package.json' with { type: 'json' }
import { modules, lessons, moduleForLesson, questionsFor, type CourseModule, type Example, type Lesson, type Question } from './data'
import { loadProgress, progressStats, recordAttempt, saveProgress } from './progress'
import { highlight } from './highlight'
import { ui } from './locale'

const app = document.querySelector<HTMLDivElement>('#app')!
const progress = loadProgress()
const repository = 'https://github.com/Evan-Windproof/C-Skeleton'
const lessonRoute = '#lesson/'
const moduleRoute = '#module/'
let storageFailed = false
const drafts = new Map<string, { optionId: string; submitted: boolean }>()
const types = { single: '单选题', boolean: '判断题', output: '输出预测', completion: '代码补全' }
const difficulty = { basic: '基础', intermediate: '中等', advanced: '进阶' }

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className = '', ...children: (Node | string)[]) {
  const element = document.createElement(tag)
  element.className = className
  element.append(...children)
  return element
}

function link(label: string, href: string, className = '') {
  const anchor = el('a', className, label)
  anchor.href = href
  return anchor
}

function button(label: string, action: () => void, className = '') {
  const element = el('button', className, label)
  element.type = 'button'
  element.addEventListener('click', action)
  return element
}

function persist() {
  storageFailed = !saveProgress(progress)
  const status = document.querySelector('#storage-status')
  if (status) status.textContent = storageFailed ? '本次学习记录仅保留在当前页面。' : ''
}

function lessonLink(lesson: Lesson, label = lesson.title, className = '') {
  return link(label, lessonRoute + lesson.id, className)
}

function moduleName(module: CourseModule) {
  return `MODULE ${String(module.id).padStart(2, '0')}`
}

function moduleLink(module: CourseModule, label = module.title, className = '') {
  return link(label, moduleRoute + module.id, className)
}

function progressView(module?: CourseModule) {
  const { total, completed, answered, accuracy } = progressStats(progress, module)
  const label = module ? ui.moduleProgress : ui.overallProgress
  const bar = el('progress')
  bar.max = total
  bar.value = completed
  bar.setAttribute('aria-label', label)
  return el('section', 'progress-card',
    el('h2', '', label),
    el('div', 'progress-value', el('strong', '', String(completed)), ` / ${total}`),
    bar,
    el('p', 'muted', `已答 ${answered} 次 · 正确率 ${accuracy === null ? '—' : `${accuracy}%`}`))
}

function header() {
  const brand = link(ui.title, '#home', 'brand')
  brand.prepend(el('span', 'brand-mark', 'C'))
  const toggle = button(progress.theme === 'dark' ? '☀ 浅色主题' : '☾ 深色主题', () => {
    progress.theme = progress.theme === 'dark' ? 'light' : 'dark'
    persist()
    render()
    document.querySelector<HTMLButtonElement>('#theme-toggle')?.focus()
  }, 'control')
  toggle.id = 'theme-toggle'
  toggle.setAttribute('aria-label', progress.theme === 'dark' ? ui.light : ui.dark)
  return el('header', 'site-header', el('div', 'topbar', brand,
    el('nav', 'top-actions', link('← ' + ui.desktop, 'https://evan.v-1.top/', 'control desktop-return'), link(ui.github + ' ↗', repository, 'github'), toggle)))
}

function home() {
  const resume = lessons.find(lesson => lesson.id === progress.current)
  const actions = el('div', 'actions', lessonLink(lessons[0], ui.start + ' →', 'primary'))
  if (resume) actions.append(lessonLink(resume, ui.resume + ' →', 'control'))
  const hero = el('section', 'hero',
    el('div', 'intro',
      el('p', 'eyebrow', 'C 语言交互式学习'),
      el('h1', '', ui.title),
      el('p', 'tagline', '用简短解释、C 代码和即时反馈，建立你的 C 语言知识骨架。'),
      actions),
    progressView())
  const cards = el('div', 'module-grid')
  for (const module of modules) {
    const { total, completed } = progressStats(progress, module)
    const card = el('article', 'module',
      el('div', 'module-meta', el('span', 'module-index', moduleName(module)),
        el('span', 'muted', `${ui.completed} ${completed} / ${total}`)),
      el('h3', '', moduleLink(module, module.title + ' →', 'module-link')),
      el('p', 'muted', module.description))
    cards.append(card)
  }
  return [hero, el('section', 'catalog', el('h2', '', ui.catalog), cards)]
}

function lessonList(module: CourseModule, active?: Lesson) {
  return el('ol', 'lesson-list', ...module.lessons.map(lesson => {
    const marker = el('span', 'completion-mark')
    marker.dataset.completeFor = lesson.id
    if (progress.completed.includes(lesson.id)) marker.textContent = `✓ ${ui.completed}`
    const entry = lessonLink(lesson)
    entry.append(marker)
    if (lesson.id === active?.id) entry.setAttribute('aria-current', 'page')
    return el('li', '', entry)
  }))
}

function moduleView(module: CourseModule) {
  const list = el('nav', 'module-lessons', lessonList(module))
  list.setAttribute('aria-label', `${module.title}课程列表`)
  return el('div', 'module-page',
    el('div', 'module-heading',
      link('← ' + ui.allModules, '#home', 'module-link'),
      el('p', 'eyebrow', moduleName(module)),
      el('h1', '', module.title),
      el('p', 'muted', module.description)),
    el('div', 'module-layout', list, progressView(module)))
}

function codeBlock(source: string) {
  const code = el('code', '', source)
  void highlight(code, source, progress.theme).catch(() => { /* Keep the plain code readable. */ })
  return el('pre', '', code)
}

function exampleView(example: Example, title: string) {
  const status = el('span', 'muted')
  status.setAttribute('role', 'status')
  const copy = button(ui.copy, () => {
    void (async () => {
      try {
        await navigator.clipboard.writeText(example.code)
        status.textContent = ui.copied
      } catch {
        status.textContent = ui.copyError
      }
    })()
  }, 'control')
  const notes = el('ol', 'line-notes', ...example.lines.map(line => el('li', '', line)))
  const section = el('section', 'panel',
    el('div', 'section-head', el('h2', '', title), el('div', 'actions', status, copy)))
  if (example.kind === 'snippet') section.append(el('p', 'muted', 'C 代码片段 · 不能独立编译'))
  section.append(codeBlock(example.code), notes)
  if (example.kind === 'program') {
    if (example.input !== undefined) section.append(el('p', 'output', '示例输入 ', el('code', '', example.input.trimEnd())))
    section.append(el('p', 'output', '预期输出 ', el('code', '', example.output)))
  }
  return section
}

function questionView(question: Question, index: number) {
  // The form owns its temporary UI. Other exercises retain focus and input when it updates.
  const form = el('form', 'question')
  form.dataset.questionId = question.id
  function draw(focusTarget?: 'option' | 'retry') {
    const draft = drafts.get(question.id)
    const result = draft?.submitted
      ? progress.attempts.findLast(attempt => attempt.questionId === question.id)
      : undefined
    const field = el('fieldset', '', el('legend', '', `${index + 1}. ${question.prompt}`))
    if (question.code) field.append(el('p', 'muted code-caption', 'C 代码片段 · 不能独立编译'), codeBlock(question.code))
    for (const option of question.options) {
      const input = el('input')
      input.type = 'radio'
      input.name = question.id
      input.value = option.id
      input.checked = draft?.optionId === option.id
      input.disabled = Boolean(result)
      const label = el('label', 'option', input, el('span', '', option.text))
      if (result && option.id === question.answerId) label.classList.add('right-option')
      if (result && !result.correct && option.id === result.optionId) label.classList.add('wrong-option')
      field.append(label)
    }

    const submit = el('button', 'control', ui.submit)
    submit.type = 'submit'
    submit.disabled = !draft || Boolean(result)
    const retry = button(ui.retry, () => {
      drafts.delete(question.id)
      draw('option')
    }, 'control')
    const feedback = el('div', 'feedback')
    feedback.setAttribute('role', 'status')
    if (result) {
      const answer = question.options.find(option => option.id === question.answerId)!
      feedback.classList.add(result.correct ? 'positive' : 'negative')
      feedback.append(el('strong', '', result.correct ? ui.correct : ui.incorrect),
        el('p', '', `${ui.answer}　${answer.text}`), el('p', '', question.explanation))
      if (!result.correct) feedback.append(el('p', '', question.feedback[result.optionId]))
      if (progress.mode === 'deep') {
        const details = el('details', '', el('summary', '', '查看错误选项分析'))
        const list = el('ul')
        for (const option of question.options) {
          if (option.id !== question.answerId) list.append(el('li', '', `${option.text} · ${question.feedback[option.id]}`))
        }
        details.append(list)
        feedback.append(details)
      }
    }

    form.replaceChildren(el('p', 'question-meta', `${types[question.type]} · ${difficulty[question.difficulty]}`), field,
      feedback, result ? retry : submit)
    field.addEventListener('change', event => {
      if (!(event.target instanceof HTMLInputElement)) return
      drafts.set(question.id, { optionId: event.target.value, submitted: false })
      submit.disabled = false
    })
    if (focusTarget === 'option') field.querySelector('input')?.focus()
    if (focusTarget === 'retry') retry.focus()
  }
  form.addEventListener('submit', event => {
    event.preventDefault()
    const draft = drafts.get(question.id)
    if (!draft || draft.submitted) return
    recordAttempt(progress, question, draft.optionId)
    draft.submitted = true
    persist()
    draw('retry')
    document.querySelector('.progress-card')?.replaceWith(progressView(moduleForLesson(question.lessonId)))
    const marker = document.querySelector<HTMLElement>(`[data-complete-for="${question.lessonId}"]`)
    if (marker && progress.completed.includes(question.lessonId)) marker.textContent = `✓ ${ui.completed}`
  })
  draw()
  return form
}

function lessonView(lesson: Lesson, module: CourseModule) {
  const index = lessons.indexOf(lesson)
  const list = el('nav', '', lessonList(module, lesson))
  list.setAttribute('aria-label', `${module.title}课程列表`)
  const directory = el('details', 'lesson-nav', el('summary', '', ui.catalog), list)
  directory.open = matchMedia('(min-width: 561px)').matches
  const modes = el('div', 'mode-switch')
  for (const mode of ['quick', 'deep'] as const) {
    const choice = button(ui[mode], () => {
      progress.mode = mode
      persist()
      render()
      document.querySelector<HTMLButtonElement>(`#mode-${mode}`)?.focus()
    })
    choice.id = `mode-${mode}`
    choice.setAttribute('aria-pressed', String(progress.mode === mode))
    modes.append(choice)
  }
  const overview = el('section', 'panel', el('h2', '', '核心概念'), el('p', '', lesson.summary))
  const details = el('details', 'lesson-details', el('summary', '', '详细解释'), el('p', '', lesson.detail))
  details.open = progress.mode === 'deep'
  overview.append(details)
  if (progress.mode === 'deep') {
    overview.append(el('h3', '', '内存或执行流程示意'),
      el('ol', 'diagram', ...lesson.diagram.map(step => el('li', '', step))))
  }
  const practice = el('section', 'practice', el('h2', '', '互动练习'),
    el('p', 'muted', '核心题全部答对即可完成本知识点，历史答题计入正确率。'),
    ...questionsFor(lesson.id, progress.mode).map(questionView))
  const pager = el('nav', 'pager')
  pager.setAttribute('aria-label', '切换知识点')
  if (index > 0) pager.append(lessonLink(lessons[index - 1], '← 上一节', 'control'))
  pager.append(index + 1 < lessons.length
    ? lessonLink(lessons[index + 1], '下一节 →', 'primary')
    : link('返回课程首页 →', '#home', 'primary'))
  return el('div', 'lesson-layout',
    el('aside', 'rail', directory, progressView(module)),
    el('article', 'lesson-content',
      el('div', 'lesson-title', el('div', 'eyebrow lesson-location',
        link(ui.allModules, '#home'), moduleLink(module, `${moduleName(module)} ${module.title}`),
        el('span', '', `${module.lessons.indexOf(lesson) + 1} / ${module.lessons.length}`)),
        el('h1', '', lesson.title), modes),
      overview, exampleView(lesson.example, '代码示例'),
      ...(progress.mode === 'deep' ? [exampleView(lesson.deepExample, '深入示例')] : []),
      practice, pager))
}

function render(navigate = false) {
  const hash = window.location.hash
  const lesson = lessons.find(item => lessonRoute + item.id === hash)
  const module = lesson ? moduleForLesson(lesson.id) : modules.find(item => moduleRoute + item.id === hash)
  if (lesson && progress.current !== lesson.id) {
    progress.current = lesson.id
    persist()
  }
  document.documentElement.dataset.theme = progress.theme
  const title = lesson?.title ?? module?.title
  document.title = title ? `${title} · ${ui.title}` : `${ui.title} · C 语言学习`
  const content = module ? [lesson ? lessonView(lesson, module) : moduleView(module)] : home()
  const main = el('main', 'container', ...content)
  main.id = 'main'
  main.tabIndex = -1
  const status = el('span', '', storageFailed ? '本次学习记录仅保留在当前页面。' : '')
  status.id = 'storage-status'
  status.setAttribute('role', 'status')
  const footer = el('footer', 'container site-footer', `${ui.title} v${version}`, link('GPL-3.0-or-later', repository + '/blob/main/LICENSE'), status)
  app.replaceChildren(header(), main, footer)
  if (navigate) {
    window.scrollTo(0, 0)
    main.focus({ preventScroll: true })
  }
}

document.querySelector('.skip')?.addEventListener('click', event => {
  event.preventDefault()
  document.getElementById('main')?.focus()
})
window.addEventListener('hashchange', () => render(true))
render()
