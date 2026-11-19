# C Skeleton

C Skeleton v0.1.0 是一个简体中文的静态 C 语言学习网站。通过简短解释、可运行的示例和带即时反馈的问答，帮助学习者理解 C 语言的知识结构。

首版提供六个模块的目录，开放「指针与内存」中的指针基础专题。速成模式每节提供两道核心题，深入模式增加第三道题、内存关系示意、代码输出和错误选项分析。每节的核心题都至少答对一次后记为完成。正确率按所有提交记录计算，重答也计入统计。

## 技术栈

HTML5、CSS3、TypeScript、Vite、Shiki、JSON、localStorage、Vitest 和 Playwright。页面与课程均可在纯静态环境中运行。使用 URL 片段切换课程，支持刷新和直接访问课程链接。

## 本地开发

使用 Node.js 20.19+（20.x）或 22.12+，建议 Node.js 24。

```sh
npm ci
npm run dev
```

打开终端中 Vite 显示的地址。课程内容和题库分别维护在 `src/data/courses.json` 和 `src/data/questions.json`。题库在应用加载时校验。

## 构建与测试

```sh
npm run typecheck
npm test
npm run build
npm run preview
```

端到端测试会在 `/C-Skeleton/` 下构建并启动生产预览，覆盖全部题目、刷新恢复、主题、复制、存储不可用和 320px 布局。

```sh
npx playwright install chromium
npm run test:e2e
```

如果系统已安装 Chromium，可用 `CHROMIUM_PATH=/usr/bin/chromium npm run test:e2e` 指定它。Linux CI 也可以用 `npx playwright install --with-deps chromium` 准备浏览器依赖。

## 部署到 GitHub Pages

1. 在 GitHub 仓库的 **Settings → Pages** 中将 **Source** 选为 **GitHub Actions**。
2. 将改动合入 `main`，或者在 Actions 中手动运行 **Deploy GitHub Pages**。
3. 部署完成后，从工作流的 `github-pages` 环境打开站点。

工作流根据 Pages 配置推导 Vite 的基础路径。手动构建项目仓库版时使用 `BASE_PATH=/C-Skeleton/ npm run build`，静态站点文件位于 `dist/`。

## 已知限制与后续

- 五个模块尚未开放。Module 3 的二级指针只在函数参数的深入解释中预告，尚无独立课程。
- 答题历史、完成状态、位置、模式和主题保存在浏览器。刷新后可以继续学习和查看统计，每题的即时反馈面板会重置。禁用存储时，记录只保留在当前页面会话。
- 界面当前只有简体中文，`src/locale.ts` 提供通用界面文案的扩展入口。复制代码需要浏览器允许访问剪贴板，通常应通过 HTTPS 或 localhost 使用。
- 下一版本建议先补齐二级指针专题与相关练习，再开放结构体指针课程，使读者能将指针和内存关系应用到更复杂的类型上。

## 许可证

GPL-3.0-or-later。参见 [LICENSE](LICENSE)。
