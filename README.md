# 云阅（Yunyue）

一个 AI 长文阅读工具。

市面上多数 AI 阅读工具都在「替你读」——帮你总结、帮你摘要，读得越多，你自己读得越少。云阅想反过来，做「扶你读」：把长文按自然结构切成小块、一次只露一块，读到卡住时再把 AI 伴读叫进来拉你一把，让你自己一步步读完。

## 功能

- **文件导入**：PDF / DOCX / Markdown / TXT，浏览器端解析
- **切块 + 逐块揭示**：按文章自然结构切成小块，一次只显示当前块，点「下一块」推进，进度、已读、时长自动统计
- **伴读**：内置多种模式（均衡伴读 / 精读拆解 / 批判质疑 / 通俗转述 / 苏格拉底式），支持自定义提示词
- **划线提问**：选中正文，让 AI 围绕这一段回答
- **划线分享卡片**：选中内容生成分享卡片，可保存图片、复制文本、系统分享
- **多模型接入**：火山方舟 / DeepSeek / Kimi / GLM / Qwen 等 OpenAI 兼容接口
- **阅读皮肤**：多套主题 + 自定义配色，可导入导出
- **稍后阅读**：记录阅读位置，随时跳回

## 技术栈

- Cloudflare Workers（API + 静态资源）
- Cloudflare D1（会话与文档存储）
- Cloudflare R2（PDF 图片存储）
- 原生前端，无框架；PDF.js 4.6 / mammoth 1.8 浏览器端解析

## 目录结构

```
api-worker.js      # Worker 后端：会话隔离、D1/R2 存取、模型代理
wrangler.jsonc     # 部署配置（database_id 需自填）
public/            # 前端静态资源
  index.html
  app.js
  styles.css
  _headers
```

## 部署

1. 安装并登录 wrangler：

```bash
npm i -g wrangler
wrangler login
```

2. 创建 D1 数据库和 R2 桶：

```bash
wrangler d1 create reading-room-db
wrangler r2 bucket create reading-room-assets
```

3. 把 `wrangler d1 create` 返回的 `database_id` 填入 `wrangler.jsonc` 的 `d1_databases[0].database_id`。

4. 部署：

```bash
wrangler deploy
```

## 使用

- 部署后打开 Workers 域名，点右上角「模型设置」，选厂商、填 API key（key 只存在你自己的 D1 会话里，不落浏览器、不进代码）。
- 导入一篇文章，开始逐块阅读。

## License

MIT
