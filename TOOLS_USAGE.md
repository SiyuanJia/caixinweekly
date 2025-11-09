# 🛠️ 构建工具使用指南

本文档详细说明如何使用 `build_issue_from_md.py` 脚本构建新期次周刊。

---

## 📋 前置要求

### Python 环境
- Python 3.7+
- `requests` 模块（用于调用云函数）

```bash
pip install requests
```

### 输入文件准备
1. **分片 Markdown 文件** - 从 PaddleOCR 或其他 OCR 工具导出
2. **Outline JSON 文件** - PDF 目录结构
3. **PDF 文件** - 原始周刊 PDF（可选，用于生成 URL）

---

## 📂 文件结构要求

### Input 目录结构

```
input/
├── 2025-41-part1.md        # 第1部分 Markdown（包含完整正文）
├── 2025-41-part2.md        # 第2部分 Markdown
├── 2025-41-part3.md        # 第3部分 Markdown
├── 2025-41-outline.json    # 目录文件
└── 财新周刊.pdf             # PDF 文件（可选）
```

### Markdown 文件格式

文件应包含以下结构：

```markdown
## 文章标题1
![](image-url-1)
文章正文内容...
长篇幅文本...

## 文章标题2
![](image-url-2)
文章正文内容...

## 文章标题3
文章正文内容...
```

**注意事项：**
- 使用 `##` 二级标题作为文章标题分隔符
- 可选：在标题后立即插入图片 `![](url)`
- 文章内容中可包含免责声明（脚本会自动移除）

### Outline JSON 格式

```json
{
  "issueTitle": "财新周刊2025第41期",
  "outline": [
    {
      "title": "文章标题1",
      "pageNumber": 2
    },
    {
      "title": "文章标题2",
      "pageNumber": 15
    },
    {
      "title": "文章标题3",
      "pageNumber": 28
    }
  ]
}
```

**关键字段：**
- `issueTitle`: 期刊标题（可选）
- `outline`: 文章列表数组
  - `title`: 文章标题（必须精确匹配 Markdown 中的标题）
  - `pageNumber`: 文章起始页码

---

## 🚀 使用步骤

### 步骤1：准备输入文件

将 Markdown、Outline 和 PDF 文件放入 `input/` 目录。

### 步骤2：运行构建脚本

#### 基础模式（仅生成 JSON，不调用 AI）

```bash
python3 tools/build_issue_from_md.py \
  --issue-id 2025-41 \
  --issue-title "财新周刊2025第41期" \
  --pdf public/data/pdfs/2025-41.pdf \
  --md-files input/2025-41-part1.md input/2025-41-part2.md input/2025-41-part3.md \
  --outline input/2025-41-outline.json \
  --output-dir public \
  --oss-base-url /
```

**耗时：** 几秒钟

**输出：**
```
public/data/
├── issues/2025-41.json      # 期刊完整数据
└── markdown/2025-41.md      # 完整 Markdown
```

#### 完整模式（调用云函数生成 AI 分析）

```bash
python3 tools/build_issue_from_md.py \
  --issue-id 2025-41 \
  --issue-title "财新周刊2025第41期" \
  --pdf public/data/pdfs/2025-41.pdf \
  --md-files input/2025-41-part1.md input/2025-41-part2.md input/2025-41-part3.md \
  --outline input/2025-41-outline.json \
  --output-dir public \
  --oss-base-url / \
  --gemini-endpoint "https://caixinweekly-pgfdddwbdi.cn-hongkong.fcapp.run" \
  --prompt-file ./prompt.txt
```

**耗时：** 取决于文章数量和网络延迟（通常 1-5 分钟）

**输出：** 同基础模式 + AI 摘要和洞察

### 步骤3：手动复制 PDF

```bash
# 将 PDF 复制到发布位置
cp input/财新周刊.pdf public/data/pdfs/2025-41.pdf
```

### 步骤4：验证输出

检查 `public/data/issues/2025-41.json` 文件是否正确生成：

```bash
# 查看 JSON 结构
cat public/data/issues/2025-41.json | head -50

# 验证文章数量
jq '.articles | length' public/data/issues/2025-41.json
```

### 步骤5：本地测试

```bash
npm run dev
# 访问 http://localhost:5173 测试新期次
```

### 步骤6：提交版本

```bash
git add public/data/
git add input/  # 可选：保存输入文件用于记录
git commit -m "feat: 添加财新周刊2025第41期"
git push
```

---

## 📊 脚本参数详解

### 必需参数

| 参数 | 说明 | 示例 |
|------|------|------|
| `--issue-id` | 期刊编号（用于生成文件名） | `2025-41` |
| `--issue-title` | 期刊标题 | `财新周刊2025第41期` |
| `--pdf` | PDF 文件路径（用于生成资源 URL） | `public/data/pdfs/2025-41.pdf` |
| `--md-files` | Markdown 输入文件列表 | `input/2025-41-part1.md input/2025-41-part2.md` |
| `--outline` | Outline JSON 文件路径 | `input/2025-41-outline.json` |
| `--output-dir` | 输出目录 | `public` |
| `--oss-base-url` | 资源基础 URL | `/` 或 `https://cdn.example.com` |

### 可选参数

| 参数 | 说明 | 默认值 | 示例 |
|------|------|--------|------|
| `--gemini-endpoint` | 云函数端点（如不提供则跳过 AI 调用） | - | `https://your-function-url` |
| `--gemini-api-key` | API Key（如需要） | - | - |
| `--prompt-file` | 自定义 Prompt 文件 | 使用默认 prompt | `./prompt.txt` |

---

## 🤖 AI 调用说明

### 启用 AI 分析

提供 `--gemini-endpoint` 参数以启用 AI 摘要和洞察生成：

```bash
--gemini-endpoint "https://caixinweekly-pgfdddwbdi.cn-hongkong.fcapp.run"
```

### Prompt 自定义

编辑 `prompt.txt` 文件来控制 AI 行为：

```
你是一名高端新闻媒体的资深财经编辑，请为每篇文章生成：
1. summary（文章AI摘要）：精炼地概括核心事实、关键论点，≤200字
2. insight（核心洞察）：提炼深层含义、趋势影响，≤500字
...
```

### 调用流程

1. 脚本按 Markdown 文件分组收集文章
2. 将每个组作为一个批次调用云函数
3. 云函数调用 Gemini API 生成 AI 结果
4. 脚本自动解析 JSON 响应
5. 将摘要和洞察填回文章对象

### 错误处理

如果 AI 调用失败：
- 脚本输出警告但继续运行
- 摘要和洞察字段保持为空字符串
- 生成的 JSON 文件仍然有效，可正常使用

---

## 📋 输出文件说明

### Issue JSON (`issues/2025-41.json`)

```json
{
  "id": "2025-41",
  "title": "财新周刊2025第41期",
  "publishDate": "",
  "pdfUrl": "/data/pdfs/2025-41.pdf",
  "articles": [
    {
      "id": "2025-41-0",
      "title": "文章标题",
      "pageNumber": 2,
      "order": 0,
      "coverImage": "https://example.com/image.jpg",
      "summary": "AI 生成的摘要...",
      "insight": "AI 生成的洞察...",
      "disclaimer": "免责声明内容..."
    },
    ...
  ]
}
```

### Markdown 文件 (`markdown/2025-41.md`)

包含所有文章的完整内容：

```markdown
## 文章标题1
![](image-url-1)
文章正文内容...

---

## 文章标题2
文章正文内容...

---
```

---

## 🐛 常见问题

### Q: 脚本报错"文章标题未匹配"

**原因：** Markdown 中的标题与 Outline JSON 中的标题不完全一致

**解决：**
1. 检查标题中的空格、标点符号
2. 统一标题格式（去除多余空格）
3. 确保中文字符编码一致

```bash
# 查看 Markdown 中的标题
grep "^## " input/2025-41-part1.md

# 查看 Outline 中的标题
jq '.outline[].title' input/2025-41-outline.json
```

### Q: 生成的 JSON 中摘要和洞察为空

**原因1：** 未提供 `--gemini-endpoint`  
**解决：** 添加云函数端点参数

**原因2：** 云函数调用失败  
**解决：** 检查网络连接和云函数地址

```bash
# 测试云函数连通性
curl -I "https://your-function-url"
```

### Q: 如何只处理特定的 Markdown 文件

**方案：** 指定需要的文件

```bash
python3 tools/build_issue_from_md.py \
  ... \
  --md-files input/2025-41-part1.md input/2025-41-part3.md
```

### Q: 输出文件在哪里

**路径：**
```
public/data/
├── issues/2025-41.json          # 期刊数据
└── markdown/2025-41.md          # 完整 Markdown
```

---

## 📈 性能优化

### 对于大型期刊（>50 篇文章）

如果遇到超时或内存问题：

1. **分批处理**：将 MD 文件分成多批运行
   ```bash
   # 第一批
   python3 tools/build_issue_from_md.py \
     ... \
     --md-files input/2025-41-part1.md input/2025-41-part2.md
   
   # 后续手动合并 JSON（如需要）
   ```

2. **跳过 AI 调用**：先生成基础 JSON
   ```bash
   # 不调用 AI，快速生成
   python3 tools/build_issue_from_md.py \
     ... \
     # 不提供 --gemini-endpoint
   ```

---

## 🔍 调试技巧

### 查看详细日志

脚本会输出详细的处理过程：

```
[INFO] 解析 Markdown，共 15 篇文章...
[INFO] 处理 MD 文件 1/2: 2025-41-part1.md (8 篇文章)
[INFO] 处理 MD 文件 2/2: 2025-41-part2.md (7 篇文章)
[INFO] 调用 Gemini，共 15 篇文章...
[INFO] ✅ Markdown 已保存: public/data/markdown/2025-41.md
[INFO] ✅ Issue JSON 已保存: public/data/issues/2025-41.json
```

### 验证输出

```bash
# 检查 JSON 格式
python3 -m json.tool public/data/issues/2025-41.json > /dev/null

# 查看文章数量
jq '.articles | length' public/data/issues/2025-41.json

# 查看摘要是否为空
jq '.articles[] | select(.summary == "") | .title' public/data/issues/2025-41.json
```

---

## 📝 完整示例

### 完整工作流程示例

```bash
# 1. 准备文件
cd /Users/yuanxi/Documents/cursor\ projects/caixin-weekly-reader
cp ~/Downloads/2025-41-part*.md input/
# 从浏览器或 PDF 工具导出 outline 到 input/2025-41-outline.json
cp ~/Downloads/财新周刊.pdf input/

# 2. 运行构建脚本
python3 tools/build_issue_from_md.py \
  --issue-id 2025-41 \
  --issue-title "财新周刊2025第41期" \
  --pdf public/data/pdfs/2025-41.pdf \
  --md-files input/2025-41-part1.md input/2025-41-part2.md \
  --outline input/2025-41-outline.json \
  --output-dir public \
  --oss-base-url / \
  --gemini-endpoint "https://caixinweekly-pgfdddwbdi.cn-hongkong.fcapp.run" \
  --prompt-file ./prompt.txt

# 3. 复制 PDF
cp input/财新周刊.pdf public/data/pdfs/2025-41.pdf

# 4. 验证
npm run dev
# 打开 http://localhost:5173 测试

# 5. 提交
git add public/data/ input/
git commit -m "feat: 添加财新周刊2025第41期"
git push
```

---

## 📞 获取帮助

遇到问题？

1. 检查脚本输出的错误信息
2. 验证输入文件格式
3. 查看本文档的 [常见问题](#-常见问题) 章节
4. 检查 `public/data/README.md` 的数据格式说明

---

**更新于：** 2025年11月  
**版本：** 2.0

