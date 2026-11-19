import { grade, lessons, moduleForLesson, questionsById, questionsFor, type CourseModule, type Question } from './data'

const key = 'c-skeleton:progress:v1'
export type Mode = 'quick' | 'deep'
export type Theme = 'dark' | 'light'
export interface Attempt { questionId: string; optionId: string; correct: boolean }
export interface Progress {
  mode: Mode
  theme: Theme
  current: string | null
  completed: string[]
  attempts: Attempt[]
}

export function loadProgress(storage?: Pick<Storage, 'getItem'>): Progress {
  const defaults: Progress = { mode: 'quick', theme: 'dark', current: null, completed: [], attempts: [] }
  try {
    const saved = JSON.parse((storage ?? window.localStorage).getItem(key) ?? 'null')
    if (!saved || typeof saved !== 'object') return defaults
    const attempts: Attempt[] = []
    if (Array.isArray(saved.attempts)) {
      for (const attempt of saved.attempts) {
        const question = questionsById.get(attempt?.questionId)
        if (question?.options.some(option => option.id === attempt.optionId)) {
          attempts.push({ questionId: question.id, optionId: attempt.optionId, correct: grade(question, attempt.optionId).correct })
        }
      }
    }
    return {
      mode: saved.mode === 'deep' ? 'deep' : 'quick',
      theme: saved.theme === 'light' ? 'light' : 'dark',
      current: lessons.some(lesson => lesson.id === saved.current) ? saved.current : null,
      completed: Array.isArray(saved.completed)
        ? lessons.filter(lesson => saved.completed.includes(lesson.id)).map(lesson => lesson.id) : [],
      attempts,
    }
  } catch {
    return defaults
  }
}

export function saveProgress(progress: Progress, storage?: Pick<Storage, 'setItem'>) {
  try {
    const target = storage ?? window.localStorage
    target.setItem(key, JSON.stringify(progress))
    return true
  } catch {
    return false
  }
}

export function recordAttempt(progress: Progress, question: Question, optionId: string) {
  const result = grade(question, optionId)
  progress.attempts.push({ questionId: question.id, optionId, correct: result.correct })
  const core = questionsFor(question.lessonId, 'quick')
  if (core.every(item => progress.attempts.some(attempt => attempt.questionId === item.id && attempt.correct))
    && !progress.completed.includes(question.lessonId)) {
    progress.completed.push(question.lessonId)
  }
  return result
}

export function progressStats(progress: Progress, module?: CourseModule) {
  const completed = module
    ? progress.completed.filter(lessonId => moduleForLesson(lessonId)?.id === module.id).length
    : progress.completed.length
  const attempts = module
    ? progress.attempts.filter(attempt => questionsById.get(attempt.questionId)?.moduleId === module.id)
    : progress.attempts
  return {
    total: module?.lessons.length ?? lessons.length,
    completed,
    answered: attempts.length,
    accuracy: attempts.length
      ? Math.round(attempts.filter(attempt => attempt.correct).length * 100 / attempts.length)
      : null,
  }
}
