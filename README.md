# 📰 财新Weekly - 现代化新闻阅读平台

<p align="center">
  <img src="./caixinlogo.jpg" alt="财新Logo" width="200"/>
</p>

一个现代化的**财新周刊**PDF阅读平台，提供优雅的阅读体验、AI智能分析和离线工作流支持。

---

## ✨ 核心特性

- 📚 **PDF智能解析** - 自动提取周刊目录书签结构
- 🎨 **精美响应式设计** - 财新品牌配色、PC/移动端适配
- 🤖 **AI智能分析** - 集成 Gemini API，为每篇文章生成摘要和核心洞察
- 📖 **高保真PDF阅读** - PDF.js 渲染，保留原始排版、支持缩放和导航
- 💾 **本地数据存储** - IndexedDB，数据安全私密，离线可用
- 🎯 **精准文章定位** - 快速跳转到任意文章位置
- ⚡ **高性能加载** - 懒加载PDF页面，首屏响应快
- 📤 **导出功能** - 支持导出 Outline 结构文件

---

## 🚀 快速开始

### 前置要求
- Node.js 16+ 
- npm 或 yarn

### 1️⃣ 安装依赖

```bash
npm install
```

### 2️⃣ 启动开发服务器

```bash
npm run dev
```

### 3️⃣ 构建生产版本

```bash
npm run build
```

---

## 📖 工作流程

### 发布新期次周刊（完整流程）

#### 第1步：准备文件

将分片 Markdown 文件和 outline.json 放入 `input/` 目录：

```
input/
├── 2025-41-part1.md
├── 2025-41-part2.md
├── 2025-41-part3.md
├── 2025-41-outline.json
└── 财新周刊2025第41期.pdf（可选，用于云函数调用）
```

**文件格式说明：**
- **Markdown 文件**：文本提取，包含完整文章内容
- **outline.json**：PDF 目录结构，格式如下：

```json
{
  "issueTitle": "财新周刊2025第41期",
  "outline": [
    { "title": "文章标题1", "pageNumber": 2 },
    { "title": "文章标题2", "pageNumber": 15 }
  ]
}
```

#### 第2步：运行构建脚本

**输出文件：**
```
public/data/
├── issues/
│   └── 2025-41.json          # 期刊完整数据（含AI摘要和洞察）
├── markdown/
│   └── 2025-41.md            # 完整正文 Markdown
└── pdfs/
    └── 2025-41.pdf           # PDF 文件（需手动复制）
```

#### 第3步：手动复制 PDF

```bash
# 将 PDF 复制到相应位置
cp input/财新周刊.pdf public/data/pdfs/2025-41.pdf
```

#### 第4步：本地测试

```bash
npm run dev
```

#### 第5步：提交版本

```bash
git add public/data/
git commit -m "feat: 添加财新周刊2025第41期"
git push
```

---

## 🌐 前端使用指南

### 首页（文章列表）

- 显示当前期次的所有文章卡片
- **卡片展示**：封面图、标题、页码、AI 摘要预览
- **交互方式**：
  - **PC端**：鼠标悬停 AI 摘要行，显示完整的摘要和核心洞察弹窗
  - **移动端**：点击 AI 摘要行右侧的箭头，在卡片下方展示弹窗

### 文章详情页

- 点击任意文章卡片，跳转到该文章的 PDF 阅读页
- **工具栏**：左上角"返回目录"按钮
- **交互**：
  - 滚动查看文章内容
  - 支持 PDF 缩放（浏览器级别）
  - 首屏快速加载，其他页面后台懒加载

### 配置面板

点击右上角齿轮图标（⚙️）打开配置面板：

- **上传新期次**：选择 PDF 文件，自动解析目录结构
- **导出 Outline**：导出刚上传的 PDF 的目录结构为 JSON 文件

---

## 🏗️ 项目架构

### 技术栈

| 层级 | 技术 | 用途 |
|-----|------|------|
| **前端框架** | React 18 + TypeScript | UI 框架 |
| **构建工具** | Vite | 高速开发构建 |
| **样式** | TailwindCSS | 原子化 CSS 框架 |
| **动画** | Framer Motion | 流畅动画效果 |
| **PDF处理** | PDF.js | 高保真 PDF 渲染 |
| **数据存储** | Dexie.js (IndexedDB) | 本地离线数据库 |
| **状态管理** | Zustand | 轻量级全局状态 |
| **图标库** | Lucide React | 现代 SVG 图标 |

### 目录结构

```
caixin-weekly-reader/
├── src/
│   ├── components/              # React 组件
│   │   ├── Layout.tsx           # 整体布局（头部+内容）
│   │   ├── ArticleCard.tsx      # 文章卡片（支持 PC/移动端弹窗）
│   │   ├── ConfigModal.tsx      # 配置弹窗（PDF 上传、导出）
│   │   ├── ReaderPage.tsx       # PDF 阅读页面（懒加载）
│   │   ├── LoadingSpinner.tsx   # 加载指示器
│   │   ├── ErrorBoundary.tsx    # 错误边界
│   │   └── ShareButton.tsx      # 分享按钮
│   │
│   ├── pages/
│   │   ├── HomePage.tsx         # 首页（文章列表）
│   │   └── ReaderPage.tsx       # 阅读页（PDF 查看）
│   │
│   ├── lib/
│   │   ├── db.ts                # Dexie 数据库定义和操作
│   │   ├── store.ts             # Zustand 全局状态
│   │   ├── pdf-parser.ts        # PDF 解析和书签提取
│   │   ├── gemini.ts            # AI 分析接口（已弃用）
│   │   ├── static-data.ts       # 静态数据加载
│   │   ├── utils.ts             # 工具函数（文本处理、markdown 转 HTML）
│   │   └── oss-config.ts        # OSS 配置（已弃用）
│   │
│   ├── App.tsx                  # 应用根组件
│   ├── main.tsx                 # 应用入口
│   └── index.css                # 全局样式和自定义滚动条
│
├── tools/
│   ├── build_issue_from_md.py   # 🔑 核心构建脚本（从 MD 文件生成 JSON）
│   └── （其他过期脚本已删除）
│
├── public/
│   ├── data/
│   │   ├── issues/              # 期刊数据 JSON 文件
│   │   ├── markdown/            # 完整 Markdown 文件
│   │   ├── pdfs/                # PDF 文件
│   │   └── README.md            # 数据文件结构说明
│   ├── pdf.worker.min.mjs       # PDF.js Worker 文件
│   └── vite.svg
│
├── input/                       # 输入文件目录
│   ├── 2025-41-part1.md
│   ├── 2025-41-part2.md
│   └── 2025-41-outline.json
│
├── package.json
├── tsconfig.json
├── tailwind.config.js           # TailwindCSS 配置（财新品牌色）
├── vite.config.ts               # Vite 构建配置
├── postcss.config.js            # PostCSS 配置
│
├── prompt.txt                   # AI 提示词模板（调用 Gemini）
├── caixin_index.py              # 🔑 云函数代码（部署到阿里云 Function Compute）
└── README.md                    # 本文档
```

---

## 🎨 设计系统

### 品牌配色

遵循财新媒体的高端品牌风格：

| 色彩 | HEX 值 | 用途 |
|------|--------|------|
| 主色 | `#1a2744` | 标题、导航、强调 |
| 强调色 | `#f5a623` | 按钮、链接、图标 |
| 背景色 | `#f8f9fa` | 页面背景 |
| 文字色 | `#333333` | 正文内容 |
| 分割线 | `#e0e0e0` | 边框、分割 |

### 响应式设计

- **PC端（≥768px）**：
  - 3列网格布局（文章卡片）
  - 弹窗显示在卡片右侧
  - 支持鼠标悬停交互
  
- **平板（768px-1024px）**：
  - 2列网格布局
  
- **手机（<768px）**：
  - 单列布局
  - 弹窗显示在卡片下方
  - 点击触发弹窗
  - 优化的内边距和字体大小

### UI 亮点

1. **AI 弹窗设计**：
   - 蓝紫渐变边框 + 发光效果
   - 自定义细滚动条（3px 宽，与边框协调）
   - 支持 Markdown 基础格式渲染（加粗、换行、列表）

2. **文章卡片**：
   - 封面图悬停放大效果
   - 平滑的 Y 轴动画
   - 金色标签序号角标

3. **阅读体验**：
   - PDF 页面平滑过渡
   - 首屏快速加载 + 后台懒加载
   - 移动端页面宽度优化

---

## 🔧 技术亮点

### 1. 智能 PDF 解析

- 自动提取 PDF 书签作为文章目录
- 支持多级书签结构
- 异常处理和容错机制

### 2. 响应式弹窗

**PC端：**
- 固定定位 (`fixed`)，相对于视口
- 实时监听 scroll/resize 事件更新位置
- 鼠标移出时自动关闭

**移动端：**
- 绝对定位 (`absolute`)，相对于文档
- 点击打开/关闭
- 跟随页面滚动
- 右上角关闭按钮

### 3. PDF 页面懒加载

```typescript
// 初始加载：目标页面 ± 10 页
// 后续：异步加载剩余页面（后台运行）
renderRange(page - 10, page + 10)  // 同步渲染
loadRest()                          // 异步加载其他页
```

### 4. 文本处理和 Markdown 支持

AI 返回的摘要和洞察可能包含：
- `**bold text**` → `<strong>`
- `\n` → `<br/>`
- `- item` → `<ul><li>`
- `1. item` → `<ol><li>`

通过 `aiTextToHtml()` 函数自动转换。

### 5. 云函数集成

通过自建云函数（`caixin_index.py`）调用 Gemini API：
- 支持批量文章请求
- 自动解析 JSON 格式输出
- CORS 头处理
- 500ms 超时机制

---

## 📊 数据流

```
input/
├── *.md (分片 Markdown 文件)
└── *-outline.json

         ↓ build_issue_from_md.py

public/data/
├── issues/*.json (完整期刊数据)
├── markdown/*.md
└── pdfs/*.pdf

         ↓ 前端加载

HomePage
├── 加载 public/data/issues/2025-41.json
├── 渲染 ArticleCard 列表
└── 支持点击打开 ReaderPage

ReaderPage
├── 根据 issue & page 参数加载 PDF
├── 目标页面快速加载
├── 其他页面后台懒加载
└── 支持缩放和导航
```

---

## 🛠️ 构建脚本使用

### build_issue_from_md.py

**功能：** 从分片 Markdown 文件构建完整的期刊 JSON

**使用场景：**
- 已有 Markdown 文本提取和 Outline 结构
- 需要调用 AI（Gemini）生成摘要和洞察

**工作流程：**
1. 读取 outline.json 作为文章清单
2. 解析 Markdown 文件，按 outline 切分内容
3. 合并所有内容到一个列表
4. 调用云函数生成 AI 摘要和洞察（可选）
5. 生成 JSON、Markdown 到 `public/data/`

**参数：**

| 参数 | 必需 | 说明 | 示例 |
|------|------|------|------|
| `--issue-id` | ✅ | 期刊编号 | `2025-41` |
| `--issue-title` | ✅ | 期刊标题 | `财新周刊2025第41期` |
| `--pdf` | ✅ | PDF 路径 | `public/data/pdfs/2025-41.pdf` |
| `--md-files` | ✅ | Markdown 文件列表 | `input/2025-41-part*.md` |
| `--outline` | ✅ | Outline JSON | `input/2025-41-outline.json` |
| `--output-dir` | ✅ | 输出目录 | `public` |
| `--oss-base-url` | ✅ | 资源基础 URL | `/` 或 CDN URL |
| `--gemini-endpoint` | ❌ | 云函数端点 | 见云函数部分 |
| `--gemini-api-key` | ❌ | API Key | - |
| `--prompt-file` | ❌ | 提示词文件 | `./prompt.txt` |


---

### Prompt 配置

编辑 `prompt.txt`，控制 AI 输出格式：

```
- summary: 文章摘要（≤200字）
- insight: 核心洞察（≤500字，建议用列表）
```

详见 `prompt.txt` 文件。

---

## 📦 部署

### Vercel 部署

1. 将项目推送到 GitHub
2. 连接到 Vercel
3. Vercel 自动识别 Vite 配置并部署

### 本地部署

```bash
npm run build
# dist/ 目录包含静态文件，可用任何服务器（Nginx、Apache）托管
```

---

## 🔒 隐私和安全

- 所有数据存储在本地浏览器（IndexedDB）
- 无服务器后端，无用户跟踪
- 仅在选择调用 AI 功能时，发送数据到云函数
- API Key 不存储在代码中，通过环境变量配置

---

## 📝 许可

MIT License

---

## 👨‍💻 开发

### 项目命令

```bash
# 开发服务器
npm run dev

# 类型检查
npm run check

# 构建生产版本
npm run build

# 预览生产构建
npm run preview
```

### 贡献指南

欢迎提交 Issue 和 PR！

### 常见问题

**Q: PDF 无法显示？**  
A: 确保 `public/data/pdfs/` 目录下存在对应的 PDF 文件，且文件名与 JSON 中的 `pdfUrl` 匹配。

**Q: AI 摘要为空？**  
A: 如果未配置云函数或调用失败，摘要将为空。此时文章仍可阅读，但无 AI 分析。

**Q: 如何自定义品牌色？**  
A: 编辑 `tailwind.config.js` 中的 `caixin-*` 色彩定义。

---

**最后更新：** 2025年11月  
**版本：** 2.0  

---

## 📞 支持

遇到问题？请查看：
- 📖 [项目架构说明](#🏗️-项目架构)
- 🔧 [构建脚本文档](#🛠️-构建脚本使用)
- 📊 [数据流程](#📊-数据流)
