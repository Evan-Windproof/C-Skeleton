# C Skeleton

网站：https://evan.v-1.top/C-Skeleton/

C Skeleton 是面向 C 语言初学者和系统编程学习者的静态课程网站。用简短的解释、可运行的示例和即时反馈，帮助你从识别代码结构，逐步过渡到读懂内存行为和独立编写代码。课程主要以 C11 为基准。

当前工作版本为 **v0.2.0-dev**。六个模块开放了 **54 节课、162 道题**，其中基础 97 道、中等 49 道、进阶 16 道。

| 模块 | 知识点 | 练习 | 内容 |
| --- | ---: | ---: | --- |
| 01 · C 语言基础 | 8 | 24 | 程序入口、类型和字面量、运算、分支、循环、输入输出 |
| 02 · 函数与程序组织 | 8 | 24 | 函数接口、值传递、作用域、存储期、头文件和链接 |
| 03 · 指针与内存 | 9 | 27 | 地址、指针算术、数组、二级指针和生命周期 |
| 04 · 复杂类型与标准库 | 9 | 27 | 结构体、枚举、函数指针、限定符、字符串和动态分配 |
| 05 · 底层 C 语言 | 10 | 30 | 位运算、对象布局、整数宽度、指针转换、未定义行为和 volatile |
| 06 · 操作系统开发预备 | 10 | 30 | 用户态与内核态、地址映射、缓冲区、链表、分配器、MMIO、汇编和启动 |

## 学习方式

- **速成模式**提供极简解释、核心示例和两道核心题。提交后可以查看正确答案、原因与所选错误选项的解析。
- **深入模式**增加完整解释、内存或执行流程示意、额外示例和练习，并可展开全部错误选项的分析。
- 可以从首页进入任一模块，也可以从第一章按顺序跨章学习。两个核心题都至少答对一次后，该节课记为完成。

总体和分模块进度均根据本地记录统计。正确率包含所有已提交答案，重答也计入。已有 v0.1 指针课程链接、答题历史、课程位置、主题和模式可继续使用。

## 项目结构

| 路径 | 用途 |
| --- | --- |
| src/data/courses.json | 模块目录、课文和示例 |
| src/data/questions.json | 题目、答案及反馈。每节前两题用于速成模式 |
| src/data.ts | 内容类型与关联校验 |
| src/main.ts、src/styles.css、src/locale.ts | 页面、主题与中文文案 |
| src/progress.ts | localStorage 读写、兼容与统计 |
| public/favicon.svg | 网站图标 |
| tests/ | Vitest、Playwright 与 C11 示例验证 |
| .github/workflows/pages.yml | GitHub Pages 工作流 |

采用 HTML、CSS、TypeScript、Vite 和 Shiki。界面和教材可随静态产物一同托管。

## 本地运行

使用 Node.js 20.19+（20.x）或 22.12+，建议 Node.js 24。

```sh
npm ci
npm run dev
```

浏览器打开终端显示的地址。

## 构建与测试

```sh
npm run typecheck
npm test
npm run build
npm run preview
```

验证 C11 示例需要安装 GCC 或兼容的 C 编译器。命令默认使用 PATH 上的 `cc`，也可在 POSIX shell 通过 `CC` 指定 GCC。可以传入模块编号，仅验证该模块。

```sh
CC=gcc npm run test:examples
CC=gcc npm run test:examples -- 3
```

示例测试逐个编译完整程序、传入示例输入并核对输出。需要其他源文件或链接配置的片段在页面中标明依赖。

浏览器测试会自动在 `/C-Skeleton/` 子路径构建并启动生产预览。

```sh
npx playwright install chromium
npm run test:e2e
```

系统已安装 Chromium 时，可以运行 `CHROMIUM_PATH=/usr/bin/chromium npm run test:e2e`。Linux CI 也可用 `npx playwright install --with-deps chromium` 准备浏览器依赖。

## 部署到 GitHub Pages

1. 在 GitHub 仓库的 **Settings → Pages** 中将 **Source** 设为 **GitHub Actions**。
2. 将准备部署的改动合入 `main`，或在 Actions 中手动运行 **Deploy GitHub Pages**。
3. 工作流成功后，从 `github-pages` 环境打开实际网址。

工作流从 Pages 配置读取基础路径。手动构建项目仓库版时，运行 `BASE_PATH=/C-Skeleton/ npm run build`，再把 `dist/` 发布到同名子路径。

## 当前限制

- 学习记录保存在同一浏览器的站点存储中。刷新会恢复统计和位置，每题当前的反馈面板会重置。禁用存储时可继续答题，记录保留至当前页面会话结束。
- 网站提供代码阅读、复制与测验。运行 C 示例需要本地编译器。系统开发章节的用户态模型与需要特定工具链的片段均有说明。
- 界面和题库目前提供简体中文。

[开发与验证报告](docs/v0.2.0-development-report.md) · [v0.2.0 更新日志草稿](CHANGELOG.md)

## 许可证

GPL-3.0-or-later。参见 [LICENSE](LICENSE)。
