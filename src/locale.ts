const zhCN = {
  title: 'C Skeleton',
  home: '课程首页',
  desktop: '返回桌面',
  github: 'GitHub',
  catalog: '课程目录',
  allModules: '全部模块',
  overallProgress: '总体学习进度',
  moduleProgress: '本模块进度',
  completed: '已完成',
  start: '开始学习',
  resume: '继续上次学习',
  quick: '速成模式',
  deep: '深入模式',
  dark: '深色主题',
  light: '浅色主题',
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
