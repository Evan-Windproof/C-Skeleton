import { createHighlighterCore } from 'shiki/core'
import { createJavaScriptRegexEngine } from 'shiki/engine/javascript'
import c from '@shikijs/langs/c'
import dark from '@shikijs/themes/github-dark'
import light from '@shikijs/themes/github-light'
import type { Theme } from './progress'

const highlighter = createHighlighterCore({
  langs: [c],
  themes: [dark, light],
  engine: createJavaScriptRegexEngine(),
})

export async function highlight(target: HTMLElement, source: string, theme: Theme) {
  const { tokens } = (await highlighter).codeToTokens(source, { lang: 'c', theme: `github-${theme}` })
  const nodes = tokens.flatMap((line, index) => {
    const spans = line.map(token => {
      const span = document.createElement('span')
      span.textContent = token.content
      if (token.color) span.style.color = token.color
      return span
    })
    return index ? [document.createTextNode('\n'), ...spans] : spans
  })
  target.replaceChildren(...nodes)
}
