import { expect, test } from '@playwright/test'
import { lessons, questionsFor } from '../src/data'

test('生产子路径加载资源，所有题目和答案完整呈现', async ({ page }) => {
  const failures: string[] = []
  const assets: string[] = []
  page.on('pageerror', error => failures.push(error.message))
  page.on('response', response => {
    if (['script', 'stylesheet'].includes(response.request().resourceType())) {
      assets.push(new URL(response.url()).pathname)
      if (!response.ok()) failures.push(response.url())
    }
  })
  await page.goto('./')
  await expect(page.getByRole('heading', { name: 'C Skeleton' })).toBeVisible()
  await expect(page.getByText('尚未开放', { exact: true })).toHaveCount(5)
  await page.getByRole('link', { name: /开始学习/ }).click()
  await expect(page.locator('pre code span').first()).toBeVisible()
  await expect(page.locator('form')).toHaveCount(2)
  await page.getByRole('button', { name: '深入模式' }).click()
  for (const [index, lesson] of lessons.entries()) {
    await expect(page.getByRole('heading', { name: lesson.title, exact: true })).toBeVisible()
    await expect(page.getByText('内存关系示意')).toBeVisible()
    await expect(page.locator('form')).toHaveCount(3)
    for (const question of questionsFor(lesson.id, 'deep')) {
      const form = page.locator(`[data-question-id="${question.id}"]`)
      await expect(form.getByRole('radio')).toHaveCount(question.options.length)
      const answer = question.options.find(option => option.id === question.answerId)!
      const wrong = question.options.find(option => option.id !== question.answerId)!
      for (const option of question.options) {
        await expect(form.getByRole('radio', { name: option.text, exact: true })).toBeVisible()
      }
      await form.getByRole('radio', { name: wrong.text, exact: true }).check()
      await form.getByRole('button', { name: '提交答案' }).click()
      await expect(form.getByText('回答错误', { exact: true })).toBeVisible()
      await expect(form.getByText(question.feedback[wrong.id], { exact: true })).toBeVisible()
      await expect(form.getByText(`正确答案　${answer.text}`, { exact: true })).toBeVisible()
      await expect(form.getByText(question.explanation, { exact: true })).toBeVisible()
      await form.getByRole('button', { name: '重新答题' }).click()
      await form.getByRole('radio', { name: answer.text, exact: true }).check()
      await form.getByRole('button', { name: '提交答案' }).click()
      await expect(form.getByText('回答正确', { exact: true })).toBeVisible()
    }
    if (index < lessons.length - 1) await page.getByRole('link', { name: /下一节/ }).click()
  }
  expect(failures).toEqual([])
  expect(assets.length).toBeGreaterThanOrEqual(2)
  expect(assets.every(path => path.startsWith('/C-Skeleton/assets/'))).toBe(true)
})

test('主题、模式、学习进度刷新恢复，窄屏没有横向溢出', async ({ page, context }) => {
  await page.setViewportSize({ width: 320, height: 820 })
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  const checkWidth = async () => {
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320)
  }
  await page.goto('./')
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await checkWidth()
  await page.getByRole('link', { name: /开始学习/ }).click()
  await page.getByRole('button', { name: '深入模式' }).click()
  await checkWidth()
  await page.getByRole('button', { name: '复制代码' }).click()
  await expect(page.getByText('已复制', { exact: true })).toBeVisible()
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(lessons[0].example.code)
  const core = questionsFor(lessons[0].id, 'quick')
  for (const question of core) {
    const form = page.locator(`[data-question-id="${question.id}"]`)
    const answer = question.options.find(option => option.id === question.answerId)!
    await form.getByRole('radio', { name: answer.text, exact: true }).check()
    await form.getByRole('button', { name: '提交答案' }).click()
  }
  await page.getByRole('link', { name: /下一节/ }).click()
  await page.getByRole('button', { name: '浅色主题' }).click()
  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
  await expect(page.getByRole('button', { name: '深入模式' })).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByRole('heading', { name: lessons[1].title })).toBeVisible()
  await expect(page.getByText('已答 2 次 · 正确率 100%')).toBeVisible()
  await expect(page.locator('progress')).toHaveAttribute('value', '1')
  await checkWidth()
  await page.getByRole('link', { name: /C Skeleton/ }).first().click()
  await page.getByRole('link', { name: /继续上次学习/ }).click()
  await expect(page.getByRole('heading', { name: lessons[1].title })).toBeVisible()
})

test('存储被阻止时仍可记录当前页面的答题', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', { get: () => { throw new Error('Storage blocked') } })
  })
  await page.goto('./')
  await page.getByRole('link', { name: /开始学习/ }).click()
  await page.getByRole('radio', { name: 'int *p;', exact: true }).check()
  await page.getByRole('button', { name: '提交答案' }).first().click()
  await expect(page.getByText('回答正确')).toBeVisible()
  await expect(page.getByText('本次学习记录仅保留在当前页面。')).toBeVisible()
})
