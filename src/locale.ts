const zhCN = {
  title: 'C Skeleton',
  home: '课程首页',
  github: 'GitHub',
  catalog: '课程目录',
  progress: '学习进度',
  start: '开始学习',
  resume: '继续上次学习',
  quick: '速成模式',
  deep: '深入模式',
  dark: '深色主题',
  light: '浅色主题',
  unavailable: '尚未开放',
  available: '开放学习',
  copy: '复制代码',
  copied: '已复制',
  copyError: '复制失败，请手动选择代码',
  submit: '提交答案',
  retry: '重新答题',
  correct: '回答正确',
  incorrect: '回答错误',
  answer: '正确答案',
} as const

export const locales = { 'zh-CN': zhCN }
export const ui = locales['zh-CN']
