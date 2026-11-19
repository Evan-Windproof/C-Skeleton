import curriculum from './data/courses.json' with { type: 'json' }
import bank from './data/questions.json' with { type: 'json' }

export type Example = { code: string; lines: string[] } & (
  { kind: 'program'; output: string; input?: string } | { kind: 'snippet' }
)

export interface Lesson {
  id: string
  title: string
  summary: string
  detail: string
  diagram: string[]
  example: Example
  deepExample: Example
}

export interface CourseModule {
  id: number
  title: string
  description: string
  lessons: Lesson[]
}

export const difficulties = ['basic', 'intermediate', 'advanced'] as const
export const questionTypes = ['single', 'boolean', 'output', 'completion'] as const

export interface Question {
  id: string
  moduleId: number
  lessonId: string
  difficulty: typeof difficulties[number]
  type: typeof questionTypes[number]
  prompt: string
  code?: string
  options: { id: string; text: string }[]
  answerId: string
  explanation: string
  feedback: Record<string, string>
}

const record = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const nonEmpty = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0

const validId = (value: unknown): value is string =>
  typeof value === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)

const textList = (value: unknown): value is string[] =>
  Array.isArray(value) && value.length > 0 && value.every(nonEmpty)

function validExample(value: unknown): value is Example {
  if (!record(value) || !nonEmpty(value.code) || !textList(value.lines)) return false
  if (value.kind === 'snippet') return true
  return value.kind === 'program' && typeof value.output === 'string'
    && (value.input === undefined || typeof value.input === 'string')
}

export function validateCurriculum(input: unknown): CourseModule[] {
  if (!Array.isArray(input) || input.length === 0) throw new Error('课程目录必须包含模块')
  const moduleIds = new Set<number>()
  const lessonIds = new Set<string>()
  for (const module of input) {
    if (!record(module) || typeof module.id !== 'number' || !Number.isSafeInteger(module.id)
      || module.id < 1 || moduleIds.has(module.id)) throw new Error('模块 ID 无效或重复')
    moduleIds.add(module.id)
    if (!nonEmpty(module.title) || !nonEmpty(module.description)
      || !Array.isArray(module.lessons) || module.lessons.length === 0) {
      throw new Error(`模块 ${module.id} 的目录无效`)
    }
    for (const lesson of module.lessons) {
      if (!record(lesson) || !validId(lesson.id) || lessonIds.has(lesson.id)) {
        throw new Error(`模块 ${module.id} 的课程 ID 无效或重复`)
      }
      lessonIds.add(lesson.id)
      if (!nonEmpty(lesson.title) || !nonEmpty(lesson.summary) || !nonEmpty(lesson.detail) || !textList(lesson.diagram)) {
        throw new Error(`课程 ${lesson.id} 缺少教学内容`)
      }
      if (!validExample(lesson.example) || !validExample(lesson.deepExample)) {
        throw new Error(`课程 ${lesson.id} 的示例无效`)
      }
    }
  }
  return input as CourseModule[]
}

export const modules = validateCurriculum(curriculum.modules)
export const lessons = modules.flatMap(module => module.lessons)
const lessonModules = new Map(modules.flatMap(module => module.lessons.map(lesson => [lesson.id, module] as const)))

export function moduleForLesson(lessonId: string) {
  return lessonModules.get(lessonId)
}

export function validateQuestions(input: unknown): Question[] {
  if (!Array.isArray(input)) throw new Error('题库必须为数组')
  const ids = new Set<string>()
  for (const item of input) {
    if (!record(item) || !validId(item.id) || ids.has(item.id)) throw new Error('题目 ID 缺失或重复')
    const invalid = (field: string): never => { throw new Error(`题目 ${item.id} 的 ${field} 无效`) }
    ids.add(item.id)
    if (!validId(item.lessonId) || typeof item.moduleId !== 'number'
      || moduleForLesson(item.lessonId)?.id !== item.moduleId) invalid('课程')
    if (!difficulties.some(value => value === item.difficulty)) invalid('难度')
    if (!questionTypes.some(value => value === item.type)) invalid('类型')
    if (!nonEmpty(item.prompt) || !nonEmpty(item.explanation)) invalid('题干或解析')
    if (item.code !== undefined && !nonEmpty(item.code)) invalid('代码')
    if ((item.type === 'output' || item.type === 'completion') && !nonEmpty(item.code)) invalid('代码')
    const options = item.options
    if (!Array.isArray(options) || options.length < 2 || (item.type === 'boolean' && options.length !== 2)) {
      throw new Error(`题目 ${item.id} 的选项数量无效`)
    }
    const optionIds = new Set<string>()
    const optionTexts = new Set<string>()
    for (const option of options) {
      if (!record(option) || !nonEmpty(option.id) || !nonEmpty(option.text)) throw new Error(`题目 ${item.id} 的选项无效`)
      if (optionIds.has(option.id) || optionTexts.has(option.text.trim())) invalid('重复选项')
      optionIds.add(option.id)
      optionTexts.add(option.text.trim())
    }
    if (!nonEmpty(item.answerId) || !optionIds.has(item.answerId)) invalid('正确答案')
    const feedback = item.feedback
    if (!record(feedback)) throw new Error(`题目 ${item.id} 缺少反馈`)
    for (const optionId of optionIds) {
      if (optionId !== item.answerId && (!Object.hasOwn(feedback, optionId) || !nonEmpty(feedback[optionId]))) invalid('错误选项反馈')
    }
    if (Object.keys(feedback).length !== optionIds.size - 1) invalid('反馈数量')
  }
  return input as Question[]
}

export const questions = validateQuestions(bank)
export const questionsById: ReadonlyMap<string, Question> = new Map(questions.map(question => [question.id, question]))
const lessonQuestions = new Map<string, Question[]>()
for (const question of questions) {
  const items = lessonQuestions.get(question.lessonId)
  if (items) items.push(question)
  else lessonQuestions.set(question.lessonId, [question])
}
for (const lesson of lessons) {
  if ((lessonQuestions.get(lesson.id)?.length ?? 0) < 3) throw new Error(`课程 ${lesson.id} 至少需要三道题`)
}

export function questionsFor(lessonId: string, mode: 'quick' | 'deep'): readonly Question[] {
  const items = lessonQuestions.get(lessonId) ?? []
  return mode === 'quick' ? items.slice(0, 2) : items
}

export function grade(question: Question, optionId: string) {
  const selected = question.options.find(option => option.id === optionId)
  const answer = question.options.find(option => option.id === question.answerId)
  if (!selected || !answer) throw new Error('选项无效')
  return { correct: selected.id === answer.id, answer: answer.text, explanation: question.explanation,
    feedback: selected.id === answer.id ? undefined : question.feedback[selected.id] }
}
