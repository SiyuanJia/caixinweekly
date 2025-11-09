# 📋 项目文件清单

## 核心文档（4个）

```
✅ README.md                        # 主文档（必读）
✅ TOOLS_USAGE.md                   # 工具使用指南（必读）
✅ CLEANUP_SUMMARY.md               # 清理总结
✅ PROJECT_STATUS.md                # 项目状态报告
```

## 核心文件（2个）

```
✅ caixin_index.py                  # 云函数代码
✅ prompt.txt                       # AI 提示词模板
```

## 工具（1个）

```
tools/
└── ✅ build_issue_from_md.py      # 🔑 唯一的构建脚本（必用）
```

## 前端代码（7个）

```
src/
├── ✅ App.tsx                      # 应用根组件
├── ✅ main.tsx                     # 应用入口
├── ✅ index.css                    # 全局样式
│
├── components/                    # React 组件库
│   ├── ✅ Layout.tsx              # 整体布局
│   ├── ✅ ArticleCard.tsx         # 文章卡片（PC/移动端弹窗）
│   ├── ✅ ConfigModal.tsx         # 配置弹窗
│   ├── ✅ ReaderPage.tsx          # PDF 阅读页面
│   ├── ✅ LoadingSpinner.tsx      # 加载指示器
│   ├── ✅ ErrorBoundary.tsx       # 错误边界
│   └── ✅ ShareButton.tsx         # 分享按钮
│
├── pages/                         # 页面组件
│   ├── ✅ HomePage.tsx            # 首页（文章列表）
│   ├── ✅ ReaderPage.tsx          # 阅读页（PDF 查看）
│   └── ✅ ConfigPage.tsx          # 配置页面
│
└── lib/                           # 核心库
    ├── ✅ db.ts                   # Dexie 数据库
    ├── ✅ store.ts                # Zustand 状态管理
    ├── ✅ pdf-parser.ts           # PDF 解析
    ├── ✅ gemini.ts               # AI 分析接口
    ├── ✅ static-data.ts          # 静态数据加载
    ├── ✅ utils.ts                # 工具函数
    └── ✅ oss-config.ts           # OSS 配置
```

## 配置文件（7个）

```
✅ package.json                     # npm 依赖和脚本
✅ package-lock.json               # 依赖锁定文件
✅ vite.config.ts                  # Vite 构建配置
✅ tsconfig.json                   # TypeScript 配置
✅ tsconfig.node.json              # TypeScript Node 配置
✅ tailwind.config.js              # TailwindCSS 配置
✅ postcss.config.js               # PostCSS 配置
```

## 数据文件（目录结构）

```
public/
└── data/
    ├── issues/                   # 期刊 JSON 数据
    ├── markdown/                 # 完整 Markdown 文件
    └── pdfs/                     # PDF 文件

input/
├── *-part1.md                   # 分片 Markdown 文件
├── *-part2.md
├── *-outline.json               # Outline 结构文件
└── [其他输入文件]
```

## 依赖文件

```
✅ requirements.txt                # Python 依赖（仅 requests）
✅ node_modules/                   # Node.js 依赖
```

---

## 删除的文件（35个）

### ❌ 临时备份（4个）
- `src/components/ArticleCard_OLD.tsx`
- `src/components/ArticleCard_NEW.tsx`
- `src/pages/ReaderPage_OLD.tsx`
- `src/pages/ReaderPage_NEW.tsx`

### ❌ 过期脚本（4个）
- `tools/build_and_deploy.py`
- `tools/build_issue_from_ocr.py`
- `tools/test_md_split.py`
- `scripts/deploy-issue.sh`

### ❌ 分散文档（11个）
- `QUICK_START.md`
- `WORKFLOW.md`
- `DEPLOYMENT.md`
- `INSTALL.md`
- `API_INTEGRATION.md`
- `DATA_STORAGE.md`
- `OSS_INTEGRATION.md`
- `ARCHITECTURE.md`
- `TEST_GUIDE.md`
- `TOOLS_README.md`
- `tools/README_MD_TOOLS.md`

### ❌ 历史记录（7个）
- `ANSWERS.md`
- `FINAL_FIXES.md`
- `FIXES_SUMMARY.md`
- `LATEST_FIXES.md`
- `PERFORMANCE_FIXES.md`
- `STATIC_DATA_FIX.md`
- `UPDATE_SUMMARY.md`

### ❌ 临时文件（9个）
- `2025-40-outline.json`
- `2025-40-part01.json`
- `2025-40-part1.md`
- `example-build.sh`
- `install.sh`
- `START.sh`
- `index.html`
- `test_output.md`
- `scripts/` 目录（整个）

---

## 文件统计

| 类型 | 数量 | 说明 |
|------|------|------|
| **保留的文件** | ~50 | 核心代码和配置 |
| **删除的文件** | 35 | 过期和临时文件 |
| **净结果** | -15 | 项目精简 |

---

## 使用指南

### 快速参考

| 需求 | 查看文档 |
|------|---------|
| 了解项目 | `README.md` |
| 发布新期次 | `TOOLS_USAGE.md` |
| 查看项目状态 | `PROJECT_STATUS.md` |
| 了解清理情况 | `CLEANUP_SUMMARY.md` |

### 开发工作流

```
1. npm install               # 安装依赖
2. npm run dev              # 启动开发服务器
3. 开发并提交代码
```

### 发布工作流

```
1. 准备文件到 input/
2. python3 tools/build_issue_from_md.py [参数]
3. 复制 PDF 到 public/data/pdfs/
4. npm run dev 测试
5. git add public/data/ && git commit && git push
```

---

## ✅ 验证清单

- [x] 所有核心文件已保留
- [x] 所有过期文件已删除
- [x] 文档已更新和整合
- [x] 项目结构已清晰
- [x] 工作流已标准化
- [x] 没有遗留文件

---

**最后更新：** 2025年11月  
**版本：** 2.0  
**状态：** ✅ 完成
