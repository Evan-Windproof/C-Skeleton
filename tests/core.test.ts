import { describe, expect, it } from 'vitest'
import { grade, lessons, modules, questions, questionsFor, validateQuestions } from '../src/data'
import { accuracy, loadProgress, recordAttempt, saveProgress, type Progress } from '../src/progress'

describe('课程与题库', () => {
  it('提供六个模块、五节课和 8/5/2 道分级题', () => {
    expect(modules).toHaveLength(6)
    expect(lessons).toHaveLength(5)
    expect(questions).toHaveLength(15)
    expect(questions.filter(question => question.difficulty === 'basic')).toHaveLength(8)
    expect(questions.filter(question => question.difficulty === 'intermediate')).toHaveLength(5)
    expect(questions.filter(question => question.difficulty === 'advanced')).toHaveLength(2)
    for (const lesson of lessons) {
      expect(questionsFor(lesson.id, 'deep')).toHaveLength(3)
      expect(questionsFor(lesson.id, 'quick')).toHaveLength(2)
      expect(lesson.example.code.split('\n').length).toBeLessThanOrEqual(20)
    }
  })

  it('逐项判定，且每个错误选项都有解析', () => {
    for (const question of questions) {
      expect(question.options.filter(option => grade(question, option.id).correct)).toHaveLength(1)
      for (const option of question.options) {
        const result = grade(question, option.id)
        expect(result.correct).toBe(option.id === question.answerId)
        expect(result.answer).toBe(question.options.find(answer => answer.id === question.answerId)?.text)
        if (!result.correct) expect(result.feedback).toBeTruthy()
      }
    }
    expect(() => grade(questions[0], 'unknown')).toThrow()
  })

  it.each([
    ['重复 ID', [questions[0], questions[0]]],
    ['无效答案', [{ ...questions[0], answerId: 'unknown' }]],
    ['缺少解析', [{ ...questions[0], feedback: {} }]],
    ['非字符串选项', [{ ...questions[0], options: [{ id: 'x', text: {} }, questions[0].options[0]] }]],
    ['无效课程', [{ ...questions[0], lessonId: 'unknown' }]],
  ])('拒绝%s', (_label, input) => {
    expect(() => validateQuestions(input)).toThrow()
  })
})

describe('学习进度', () => {
  const [first, second, extra] = questionsFor(lessons[0].id, 'deep')

  it('保留重答记录并在核心题均答对后完成课程', () => {
    const progress = loadProgress({ getItem: () => null })
    expect(accuracy(progress)).toBeNull()
    recordAttempt(progress, first, first.options.find(option => option.id !== first.answerId)!.id)
    recordAttempt(progress, extra, extra.answerId)
    recordAttempt(progress, first, first.answerId)
    expect(progress.completed).toEqual([])
    recordAttempt(progress, second, second.answerId)
    recordAttempt(progress, second, second.answerId)
    expect(progress.completed).toEqual([first.lessonId])
    expect(accuracy(progress)).toBe(80)
  })

  it('序列化并恢复模式、主题、课程位置和答题记录', () => {
    let saved = ''
    const progress: Progress = { current: first.lessonId, mode: 'deep', theme: 'light', completed: [], attempts: [] }
    recordAttempt(progress, first, first.answerId)
    recordAttempt(progress, second, second.answerId)
    expect(saveProgress(progress, { setItem: (_key, value) => { saved = value } })).toBe(true)
    expect(loadProgress({ getItem: () => saved })).toEqual(progress)
  })

  it('容忍损坏的数据和存储异常', () => {
    const defaults = loadProgress({ getItem: () => null })
    const fail = () => { throw new Error('storage unavailable') }
    expect(loadProgress({ getItem: fail })).toEqual(defaults)
    expect(loadProgress({ getItem: () => '{' })).toEqual(defaults)
    expect(saveProgress(defaults, { setItem: fail })).toBe(false)
  })
})
