# Yifo AI Translate

一个可在 `Windows/macOS` 上侧载到 `Chrome/Chromium` 的准确优先网页翻译扩展。

它面向自用和小范围分享：每个用户填写自己的 `GLM Coding Plan`、`DeepSeek` 或 `OpenAI-compatible` API Key，扩展不内置共享密钥，也不需要后端服务。

## 功能

- 支持 `GLM Coding Plan`、`DeepSeek` 与通用 `OpenAI-compatible` Provider
- 整页翻译、双语/纯译文切换、恢复原文
- 滚动后自动识别新出现的英文内容并增量补翻译
- 页面右侧常驻一键翻译按钮，支持拖拽到左右侧、贴边半隐藏
- 当前站点“总是翻译 / 永不翻译”
- 模型自动拉取、API 连通测试
- 本地存储配置，支持安全导出/完整导出与导入

## 快速开始

```bash
npm install
npm run build
```

然后在浏览器里加载 `dist/` 目录。

更详细的安装和使用步骤见 [docs/INSTALL.zh-CN.md](docs/INSTALL.zh-CN.md)。

## 浏览器导入

### Chrome on Windows / macOS

1. 打开 `chrome://extensions`
2. 打开右上角“开发者模式”
3. 点击“加载已解压的扩展程序”
4. 选择项目构建后的 `dist/` 目录
5. 点击工具栏里的 `Yifo AI Translate`，填写自己的 API Key 并测试连通

### Atlas on macOS

1. 打开 Atlas 的扩展程序管理页
2. 开启开发者模式
3. 加载 `dist/` 目录
4. 首次安装后打开扩展弹窗，填写 API Key 并测试连通

> 常驻浮标需要普通网页访问权限。侧载后 Chrome 可能会显示“在所有网站上”的访问范围；API Key 只保存在本机扩展存储中，不会提交到仓库。

## 常用命令

```bash
npm run dev
npm run test
npm run lint
npm run build
npm run release
```

## 目录说明

- `src/background/`：Provider 适配、翻译请求、站点规则、右键菜单。
- `src/content/`：页面文本抽取、译文渲染、浮动按钮、动态页面增量翻译。
- `src/popup/`：工具栏弹窗和主要操作入口。
- `src/options/`：完整设置页、配置导入导出。
- `src/shared/`：共享类型、存储、消息、Provider API 工具。
- `tests/`：核心逻辑单元测试。
- `public/manifest.json`：Manifest V3 扩展声明。

## 发布给朋友

1. 运行 `npm run release`
2. 把 `release/` 里的 zip 包发给朋友
3. 朋友解压后按 [安装说明](docs/INSTALL.zh-CN.md) 侧载安装

默认导出配置不包含 `API Key`。如果要导出完整配置，设置页会再次提醒敏感信息风险。

## 安全说明

- 不要把自己的完整配置导出文件发给别人。
- 不要把 API Key 写进源码、README、issue 或 commit message。
- 仓库默认忽略 `dist/`、`release/`、`node_modules/` 和 `.env*`，这些内容应在本地重新生成。
