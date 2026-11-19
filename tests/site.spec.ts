import { expect, test } from '@playwright/test'
import { lessons, modules, questionsFor } from '../src/data'

test('Pages 子路径加载资源，保留桌面、GitHub 和 favicon 入口', async ({ page }) => {
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
  await expect(page.getByRole('heading', { name: 'C Skeleton', exact: true })).toBeVisible()
  await expect(page.getByRole('link', { name: /返回桌面/ })).toHaveAttribute('href', 'https://evan.v-1.top/')
  await expect(page.getByRole('link', { name: /GitHub/ })).toHaveAttribute('href', 'https://github.com/Evan-Windproof/C-Skeleton')
  const icon = page.locator('link[rel="icon"]')
  await expect(icon).toHaveAttribute('href', '/C-Skeleton/favicon.svg')
  const response = await page.request.get(new URL('/C-Skeleton/favicon.svg', page.url()).href)
  expect(response.ok()).toBe(true)
  expect(response.headers()['content-type']).toContain('image/svg+xml')
  expect(await response.text()).toContain('<svg')
  await expect(page.getByRole('progressbar', { name: '总体学习进度' })).toHaveAttribute('max', String(lessons.length))
  await page.getByRole('link', { name: /开始学习/ }).click()
  await expect(page.getByRole('heading', { name: lessons[0].title, exact: true })).toBeVisible()
  await expect(page.locator('pre code span').first()).toBeVisible()
  expect(failures).toEqual([])
  expect(assets.length).toBeGreaterThanOrEqual(2)
  expect(assets.every(path => path.startsWith('/C-Skeleton/assets/'))).toBe(true)
  await page.route('https://evan.v-1.top/', route => route.fulfill({ body: 'Evavind' }))
  await page.getByRole('link', { name: /返回桌面/ }).click()
  await expect(page).toHaveURL('https://evan.v-1.top/')
})

for (const module of modules) {
  test(`模块 ${module.id} 的课程列表、导航和全部练习可用`, async ({ page }) => {
    await page.goto('./')
    await page.getByRole('link', { name: `${module.title} →`, exact: true }).click()
    await expect(page.getByRole('heading', { name: module.title, exact: true })).toBeVisible()
    const list = page.getByRole('navigation', { name: `${module.title}课程列表` })
    await expect(list.getByRole('link')).toHaveCount(module.lessons.length)
    for (const lesson of module.lessons) {
      await expect(list.getByRole('link', { name: lesson.title, exact: true })).toHaveAttribute('href', `#lesson/${lesson.id}`)
    }
    await list.getByRole('link', { name: module.lessons[0].title, exact: true }).click()
    await expect(page.locator('form')).toHaveCount(2)
    await expect(page.getByRole('heading', { name: '深入示例', exact: true })).toHaveCount(0)
    await page.getByRole('button', { name: '深入模式' }).click()
    for (const [index, lesson] of module.lessons.entries()) {
      await expect(page.getByRole('heading', { name: lesson.title, exact: true })).toBeVisible()
      await expect(page.getByText('内存或执行流程示意')).toBeVisible()
      await expect(page.getByRole('heading', { name: '深入示例', exact: true })).toBeVisible()
      const practice = questionsFor(lesson.id, 'deep')
      await expect(page.locator('form')).toHaveCount(practice.length)
      for (const question of practice) {
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
      const progress = page.getByRole('progressbar', { name: '本模块进度' })
      await expect(progress).toHaveAttribute('value', String(index + 1))
      const next = lessons[lessons.indexOf(lesson) + 1]
      if (next) {
        await page.getByRole('link', { name: /下一节/ }).click()
        await expect(page.getByRole('heading', { name: next.title, exact: true })).toBeVisible()
        if (index === module.lessons.length - 1) {
          await expect(progress).toHaveAttribute('value', '0')
          await page.getByRole('link', { name: /上一节/ }).click()
          await expect(page.getByRole('heading', { name: lesson.title, exact: true })).toBeVisible()
          await expect(progress).toHaveAttribute('value', String(module.lessons.length))
        }
      } else {
        await page.getByRole('link', { name: /返回课程首页/ }).click()
        await expect(page.getByRole('progressbar', { name: '总体学习进度' })).toHaveAttribute('value', String(module.lessons.length))
      }
    }
  })
}

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
  await expect(page.locator('details.lesson-nav')).not.toHaveAttribute('open', '')
  await page.locator('details.lesson-nav summary').click()
  await expect(page.locator('details.lesson-nav')).toHaveAttribute('open', '')
  await page.getByRole('button', { name: '深入模式' }).click()
  await checkWidth()
  await page.getByRole('button', { name: '复制代码', exact: true }).first().click()
  await expect(page.getByText('已复制', { exact: true })).toBeVisible()
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(lessons[0].example.code)
  for (const question of questionsFor(lessons[0].id, 'quick')) {
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
  await expect(page.getByRole('heading', { name: lessons[1].title, exact: true })).toBeVisible()
  await expect(page.getByText('已答 2 次 · 正确率 100%')).toBeVisible()
  await expect(page.getByRole('progressbar', { name: '本模块进度' })).toHaveAttribute('value', '1')
  await checkWidth()
  await page.getByRole('link', { name: /C Skeleton/ }).first().click()
  await expect(page.getByRole('progressbar', { name: '总体学习进度' })).toHaveAttribute('value', '1')
  await page.getByRole('link', { name: /继续上次学习/ }).click()
  await expect(page.getByRole('heading', { name: lessons[1].title, exact: true })).toBeVisible()
  await page.getByRole('link', { name: /MODULE 01 C 语言基础/ }).click()
  await expect(page.getByRole('navigation', { name: 'C 语言基础课程列表' })).toBeVisible()
  await checkWidth()
})

test('升级后恢复 v0.1 指针进度及旧课程链接', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('c-skeleton:progress:v1', JSON.stringify({
      current: 'parameters', mode: 'deep', theme: 'light', completed: ['declaration'],
      attempts: [{ questionId: 'p01', optionId: '1', correct: true }, { questionId: 'p02', optionId: '1', correct: true }],
    }))
  })
  await page.goto('./')
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
  await expect(page.getByRole('progressbar', { name: '总体学习进度' })).toHaveAttribute('value', '1')
  await page.getByRole('link', { name: /继续上次学习/ }).click()
  await expect(page).toHaveURL(/#lesson\/parameters$/)
  await expect(page.getByRole('button', { name: '深入模式' })).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByText('已答 2 次 · 正确率 100%')).toBeVisible()
  await expect(page.getByRole('link', { name: /地址与指针声明.*已完成/ })).toBeVisible()
})

test('存储被阻止时仍可记录当前页面的答题', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', { get: () => { throw new Error('Storage blocked') } })
  })
  await page.goto('./#lesson/declaration')
  await page.getByRole('radio', { name: 'int *p;', exact: true }).check()
  await page.getByRole('button', { name: '提交答案' }).first().click()
  await expect(page.getByText('回答正确')).toBeVisible()
  await expect(page.getByText('本次学习记录仅保留在当前页面。')).toBeVisible()
})
