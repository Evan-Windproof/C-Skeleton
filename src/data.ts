import curriculum from './data/courses.json' with { type: 'json' }
import bank from './data/questions.json' with { type: 'json' }

export interface Lesson {
  id: string
  title: string
  summary: string
  detail: string
  diagram: string[]
  example: { code: string; lines: string[]; output: string }
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

export const modules = curriculum.modules
export const lessonModuleId = curriculum.lessonModuleId
export const lessons: Lesson[] = curriculum.lessons

const record = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const nonEmpty = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0

export function validateQuestions(input: unknown): Question[] {
  if (!Array.isArray(input)) throw new Error('题库必须为数组')
  const ids = new Set<string>()
  for (const item of input) {
    if (!record(item) || !nonEmpty(item.id) || ids.has(item.id)) throw new Error('题目 ID 缺失或重复')
    const invalid = (field: string): never => { throw new Error(`题目 ${item.id} 的 ${field} 无效`) }
    ids.add(item.id)
    if (item.moduleId !== lessonModuleId || !lessons.some(lesson => lesson.id === item.lessonId)) invalid('课程')
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

export function questionsFor(lessonId: string, mode: 'quick' | 'deep') {
  const items = questions.filter(question => question.lessonId === lessonId)
  return mode === 'quick' ? items.slice(0, 2) : items
}

export function grade(question: Question, optionId: string) {
  const selected = question.options.find(option => option.id === optionId)
  const answer = question.options.find(option => option.id === question.answerId)
  if (!selected || !answer) throw new Error('选项无效')
  return { correct: selected.id === answer.id, answer: answer.text, explanation: question.explanation,
    feedback: selected.id === answer.id ? undefined : question.feedback[selected.id] }
}
