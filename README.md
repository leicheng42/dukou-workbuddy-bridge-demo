# Dukou → Relay Chat Demo

一个可直接在浏览器运行、也可以通过 Dukou 投递微信聊天记录的对话 Demo。它演示了 WorkBuddy 类产品收到微信“合并转发”ZIP 后的关键体验：

- 在聊天输入区显示“转发内容”卡片；
- 点击卡片查看发送人、时间、文本和图片；
- 从原始记录中生成要点、结论和待办预演；
- 文件只在本机浏览器内解压与解析，不上传服务器。

> 这是独立的技术演示，不代表腾讯 WorkBuddy、微信或 Dukou 官方。界面和样例数据均为 Demo 自建。

![Dukou 转发后的聊天摘要](docs/demo-summary.png)

<details>
  <summary>查看“转发内容”完整预览</summary>
  <img src="docs/archive-preview.png" alt="转发内容时间线预览" />
</details>

## 在线演示

部署完成后访问：

<https://leicheng42.github.io/dukou-workbuddy-bridge-demo/>

## 两条体验路径

### 1. 浏览器内直接体验

1. 点击“模拟 Dukou 转发”，查看转发卡片、时间线和摘要。
2. 点击卡片打开完整聊天记录。
3. 点击附件右侧的移除按钮可重新导入。
4. 也可以选择真实的微信聊天记录 ZIP、TXT、HTML 或 JSON。

支持拖入文件，也支持系统剪贴板中的文件直接 `⌘V`。

### 2. 通过 Dukou 投递

1. 在 Chrome 中打开在线演示地址。
2. 在 Dukou 的“发送到自定义”中添加 Chrome。
3. 在微信中选择聊天记录并“合并转发”给 Dukou。
4. Dukou 会激活当前 Chrome 页面并发送 `⌘V`。
5. Demo 页面会自动聚焦输入框，同时监听窗口级 paste，解析文件后显示“转发内容”。

如果 Chrome 启动后不是同一个标签页，请把 Demo 保持在前台，或直接使用 Dukou 的“复制到剪贴板”，回到 Demo 页面按 `⌘V`。

## 客户端实际处理了什么

微信导出的聊天记录通常是一个 ZIP：

```text
聊天记录_20261028_104435.zip
├── 聊天记录.txt
└── 聊天记录内的图片、视频和文件/
```

Demo 在浏览器里完成以下步骤：

1. 读取粘贴或拖入的文件；
2. 解压 ZIP；
3. 找到转录文本并兼容 UTF-8 / GB18030；
4. 解析“发送人 / 时间 / 内容”格式；
5. 将图片建立本地 Blob URL，并与消息正文中的文件名关联；
6. 用本地规则提取明确的行动指令和时间词；
7. 渲染聊天附件卡片和可展开的时间线。

没有后端，没有遥测，没有 API Key，也不会把聊天内容写入 Local Storage。

## 本地运行

```bash
npm install
npm run dev
```

构建和测试：

```bash
npm test
npm run build
```

## 测试

- Vitest 覆盖转录解析、ZIP 解包、媒体匹配、摘要和文件大小格式化。
- Playwright 覆盖“载入示例 → 打开预览 → 发送 → 摘要生成”的完整界面链路。

浏览器验收依赖见 `requirements-e2e.txt`。先启动 `npm run dev`，再运行：

```bash
python3 e2e/demo_test.py
```

脚本默认使用 macOS Chrome，也可以通过 `CHROME_PATH` 指定 Chromium 可执行文件。

## 边界

- 本地摘要使用可解释的规则预演，不调用 AI 服务。
- 微信不同版本导出的字段可能略有差异；Demo 以常见纯文本和 HTML 转录为优先。
- 浏览器无法直接读取只存在于系统剪贴板中的本地路径字符串。通过 Dukou 粘贴时，Chrome 应以 `File` 形式提供文件；若浏览器没有暴露文件对象，使用拖拽或文件选择器即可。

## License

[MIT](LICENSE)
