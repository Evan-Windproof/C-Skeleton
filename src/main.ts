import './styles.css'
import { modules, lessons, lessonModuleId, questionsFor, type Lesson, type Question } from './data'
import { accuracy, loadProgress, recordAttempt, saveProgress } from './progress'
import { highlight } from './highlight'
import { ui } from './locale'

const app = document.querySelector<HTMLDivElement>('#app')!
const progress = loadProgress()
const repository = 'https://github.com/Evan-Windproof/C-Skeleton'
const routePrefix = '#lesson/'
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
  return link(label, routePrefix + lesson.id, className)
}

function progressView() {
  const count = progress.completed.length
  const rate = accuracy(progress)
  const bar = el('progress')
  bar.max = lessons.length
  bar.value = count
  bar.setAttribute('aria-label', ui.progress)
  return el('section', 'progress-card',
    el('h2', '', ui.progress),
    el('div', 'progress-value', el('strong', '', String(count)), ` / ${lessons.length}`),
    bar,
    el('p', 'muted', `已答 ${progress.attempts.length} 次 · 正确率 ${rate === null ? '—' : `${rate}%`}`))
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
    el('nav', 'top-actions', link(ui.github + ' ↗', repository, 'github'), toggle)))
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
    const available = module.id === lessonModuleId
    const title = el('h3', '', module.title)
    const card = el('article', available ? 'module available' : 'module',
      el('div', 'module-meta', el('span', 'module-index', `MODULE ${String(module.id).padStart(2, '0')}`),
        el('span', available ? 'available-label' : 'muted', available ? ui.available : ui.unavailable)),
      title,
      el('p', 'topics muted', module.topics.join(' · ')))
    if (available) {
      card.append(el('p', 'muted', '当前专题包含 5 个知识点。二级指针专项尚未开放。'),
        lessonLink(lessons[0], '进入指针基础 →', 'module-link'))
    }
    cards.append(card)
  }
  return [hero, el('section', 'catalog', el('h2', '', ui.catalog), cards)]
}

function codeBlock(source: string) {
  const code = el('code', '', source)
  void highlight(code, source, progress.theme).catch(() => { /* Keep the plain code readable. */ })
  return el('pre', '', code)
}

function exampleView(lesson: Lesson) {
  const status = el('span', 'muted')
  status.setAttribute('role', 'status')
  const copy = button(ui.copy, () => {
    void (async () => {
      try {
        await navigator.clipboard.writeText(lesson.example.code)
        status.textContent = ui.copied
      } catch {
        status.textContent = ui.copyError
      }
    })()
  }, 'control')
  const notes = el('ol', 'line-notes', ...lesson.example.lines.map(line => el('li', '', line)))
  const section = el('section', 'panel',
    el('div', 'section-head', el('h2', '', '代码示例'), el('div', 'actions', status, copy)),
    codeBlock(lesson.example.code), notes)
  if (progress.mode === 'deep') {
    section.append(el('p', 'output', '程序输出 ', el('code', '', lesson.example.output)))
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
    if (question.code) field.append(el('p', 'muted code-caption', 'C 代码片段'), codeBlock(question.code))
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
    document.querySelector('.progress-card')?.replaceWith(progressView())
    updateCompletionMarker(question.lessonId)
  })
  draw()
  return form
}

function updateCompletionMarker(lessonId: string) {
  const marker = document.querySelector<HTMLElement>(`[data-complete-for="${lessonId}"]`)
  if (marker && progress.completed.includes(lessonId)) marker.textContent = '✓'
}

function lessonView(lesson: Lesson) {
  const index = lessons.indexOf(lesson)
  const list = el('nav', 'lesson-nav', el('h2', '', '指针基础'))
  list.setAttribute('aria-label', '指针基础知识点')
  for (const item of lessons) {
    const marker = el('span', 'completion-mark', progress.completed.includes(item.id) ? '✓' : '')
    marker.dataset.completeFor = item.id
    const entry = lessonLink(item)
    entry.append(marker)
    if (item.id === lesson.id) entry.setAttribute('aria-current', 'page')
    list.append(entry)
  }
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
    overview.append(el('h3', '', '内存关系示意'),
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
    el('aside', 'rail', list, progressView()),
    el('article', 'lesson-content',
      el('div', 'lesson-title', el('p', 'eyebrow', `MODULE 03 / 指针基础 · ${index + 1} / ${lessons.length}`),
        el('h1', '', lesson.title), modes),
      overview, exampleView(lesson), practice, pager))
}

function render(navigate = false) {
  const hash = window.location.hash
  const lesson = hash.startsWith(routePrefix) ? lessons.find(item => routePrefix + item.id === hash) : undefined
  if (lesson && progress.current !== lesson.id) {
    progress.current = lesson.id
    persist()
  }
  document.documentElement.dataset.theme = progress.theme
  document.title = lesson ? `${lesson.title} · ${ui.title}` : `${ui.title} · C 语言学习`
  const main = el('main', 'container', ...(lesson ? [lessonView(lesson)] : home()))
  main.id = 'main'
  main.tabIndex = -1
  const status = el('span', '', storageFailed ? '本次学习记录仅保留在当前页面。' : '')
  status.id = 'storage-status'
  status.setAttribute('role', 'status')
  const footer = el('footer', 'container site-footer', 'C Skeleton v0.1.0', link('GPL-3.0-or-later', repository + '/blob/main/LICENSE'), status)
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
