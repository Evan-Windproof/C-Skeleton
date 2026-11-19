import { describe, expect, it } from 'vitest'
import { grade, lessons, moduleForLesson, modules, questions, questionsFor, validateCurriculum, validateQuestions } from '../src/data'
import { loadProgress, progressStats, recordAttempt, saveProgress, type Progress } from '../src/progress'

describe('课程与题库', () => {
  it('模块顺序正确，课程和题目 ID 唯一且关联有效', () => {
    expect(modules.map(module => module.id)).toEqual([1, 2, 3, 4, 5, 6])
    const required = [8, 8, 9, 9, 10, 10]
    for (const [index, module] of modules.entries()) {
      expect(module.lessons.length).toBeGreaterThanOrEqual(required[index])
    }
    expect(new Set(lessons.map(lesson => lesson.id)).size).toBe(lessons.length)
    expect(new Set(questions.map(question => question.id)).size).toBe(questions.length)
    for (const lesson of lessons) {
      const bank = questionsFor(lesson.id, 'deep')
      expect(bank.length).toBeGreaterThanOrEqual(3)
      expect(bank.length).toBeLessThanOrEqual(5)
      expect(questionsFor(lesson.id, 'quick')).toEqual(bank.slice(0, 2))
      expect(bank.every(question => question.moduleId === moduleForLesson(lesson.id)?.id)).toBe(true)
    }
  })

  it('拒绝跨模块的重复课程 ID 和缺失输出的完整程序', () => {
    const [first, second] = modules
    const lesson = lessons[0]
    expect(() => validateCurriculum([{ ...first, lessons: [lesson] }, { ...second, lessons: [lesson] }])).toThrow(/课程 ID/)
    expect(() => validateCurriculum([{ ...first, lessons: [{ ...lesson, example: { ...lesson.example, output: undefined } }] }])).toThrow(/示例/)
  })

  it('拒绝没有课程的模块', () => {
    expect(() => validateCurriculum([{ ...modules[0], lessons: [] }])).toThrow(/目录/)
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
    ['课程和模块不匹配', [{ ...questions[0], moduleId: 6 }]],
  ])('拒绝%s', (_label, input) => {
    expect(() => validateQuestions(input)).toThrow()
  })
})

describe('学习进度', () => {
  const [first, second, extra] = questionsFor(lessons[0].id, 'deep')

  it('保留重答记录并在核心题均答对后完成课程', () => {
    const progress = loadProgress({ getItem: () => null })
    expect(progressStats(progress).accuracy).toBeNull()
    recordAttempt(progress, first, first.options.find(option => option.id !== first.answerId)!.id)
    recordAttempt(progress, extra, extra.answerId)
    recordAttempt(progress, first, first.answerId)
    expect(progress.completed).toEqual([])
    recordAttempt(progress, second, second.answerId)
    recordAttempt(progress, second, second.answerId)
    expect(progress.completed).toEqual([first.lessonId])
    expect(progressStats(progress).accuracy).toBe(80)
  })

  it('序列化并恢复模式、主题、课程位置和答题记录', () => {
    let saved = ''
    const progress: Progress = { current: first.lessonId, mode: 'deep', theme: 'light', completed: [], attempts: [] }
    recordAttempt(progress, first, first.answerId)
    recordAttempt(progress, second, second.answerId)
    expect(saveProgress(progress, { setItem: (_key, value) => { saved = value } })).toBe(true)
    expect(loadProgress({ getItem: () => saved })).toEqual(progress)
  })

  it('继续读取 v0.1 进度，分模块统计旧答题和完成状态', () => {
    const legacy: Progress = {
      current: 'parameters', mode: 'deep', theme: 'light', completed: ['declaration'],
      attempts: [
        { questionId: 'p01', optionId: '0', correct: false },
        { questionId: 'p01', optionId: '1', correct: true },
        { questionId: 'p02', optionId: '1', correct: true },
      ],
    }
    const progress = loadProgress({
      getItem: key => {
        expect(key).toBe('c-skeleton:progress:v1')
        return JSON.stringify(legacy)
      },
    })
    expect(progress).toEqual(legacy)
    expect(progressStats(progress, modules[2])).toEqual({
      total: modules[2].lessons.length, completed: 1, answered: 3, accuracy: 67,
    })
    expect(progressStats(progress, modules[0])).toEqual({
      total: modules[0].lessons.length, completed: 0, answered: 0, accuracy: null,
    })
    expect(progressStats(progress)).toEqual({ total: lessons.length, completed: 1, answered: 3, accuracy: 67 })
  })

  it('六个模块的完成数和正确率分别统计，总进度合并计算', () => {
    const progress = loadProgress({ getItem: () => null })
    for (const module of modules) {
      const [first, second] = questionsFor(module.lessons[0].id, 'quick')
      recordAttempt(progress, first, first.options.find(option => option.id !== first.answerId)!.id)
      recordAttempt(progress, first, first.answerId)
      recordAttempt(progress, second, second.answerId)
    }
    for (const module of modules) {
      expect(progressStats(progress, module)).toEqual({
        total: module.lessons.length, completed: 1, answered: 3, accuracy: 67,
      })
    }
    expect(progressStats(progress)).toEqual({ total: lessons.length, completed: 6, answered: 18, accuracy: 67 })
  })

  it('容忍损坏的数据和存储异常', () => {
    const defaults = loadProgress({ getItem: () => null })
    const fail = () => { throw new Error('storage unavailable') }
    expect(loadProgress({ getItem: fail })).toEqual(defaults)
    expect(loadProgress({ getItem: () => '{' })).toEqual(defaults)
    expect(saveProgress(defaults, { setItem: fail })).toBe(false)
  })
})
