# 🐛 GitHub Pages 白屏修复指南

## 问题诊断

你的项目在 GitHub Pages 上白屏的原因是 **缺少 base 路径配置**。

GitHub Pages 将项目部署在子路径 `/caixinweekly/` 而不是根目录，但 Vite 默认以根目录构建。

---

## ✅ 已完成的修复

### 1. vite.config.ts - 添加 base 配置

```typescript
export default defineConfig({
  // GitHub Pages 基础路径配置
  base: '/caixinweekly/',
  
  plugins: [react()],
  // ... 其他配置
})
```

### 2. 修复类型定义

添加 `disclaimer` 字段到以下接口：
- `src/lib/db.ts` - `Article` interface
- `src/lib/static-data.ts` - `StaticArticle` interface

### 3. 清理未使用变量

- `src/pages/HomePage.tsx` - 移除未使用的 `ChevronDown` 和 `navigate`
- `src/pages/ReaderPage.tsx` - 恢复必要的状态变量
- `src/lib/pdf-parser.ts` - 移除对 `Blob.name` 的引用

---

## 🚀 本地构建和部署

在你的 Mac 上执行以下步骤：

### 1️⃣ 重新构建项目

```bash
cd "/Users/yuanxi/Documents/cursor projects/caixin-weekly-reader"

# 清除旧的构建文件
rm -rf dist

# 重新构建
npm run build
```

### 2️⃣ 验证构建成功

构建完成后，你应该看到：

```
vite v5.4.x building for production...
✓ 1234 modules transformed
dist/index.html                  x.xx kB │ gzip: x.xx kB
dist/assets/index-xxxx.js        xxx.xx kB │ gzip: xxx.xx kB
✓ built in x.xxs
```

### 3️⃣ 本地测试构建结果

```bash
# 使用 vite 预览构建
npm run preview

# 访问 http://localhost:4173
# 注意：本地测试时会显示空页面（因为 base 是 /caixinweekly/）
```

### 4️⃣ 提交到 GitHub

```bash
git add .
git commit -m "fix: GitHub Pages base 路径配置"
git push origin main
```

---

## 📍 GitHub Pages 自动部署

提交后，GitHub Actions 应该会：

1. ✅ 自动检测 `vite build` 命令
2. ✅ 构建项目到 `dist/` 目录
3. ✅ 部署到 GitHub Pages

**部署完成后访问：**
https://siyuanjia.github.io/caixinweekly/

---

## ⚠️ 常见问题

### Q: 为什么本地 npm run dev 还是用 5173 端口？

A: 本地开发时 base 路径不重要，只有生产构建才会用到。

### Q: 部署后仍然白屏？

A: 检查以下几点：

```bash
# 1. 确认构建成功
ls -la dist/index.html

# 2. 检查 GitHub Pages 设置
# 在 GitHub 仓库：Settings → Pages
# 确保 Source 设置为 "Deploy from a branch"
# 选择 "main" 分支和 "/ (root)" 目录

# 3. 清除浏览器缓存
# Ctrl+Shift+Delete（Windows）或 Cmd+Shift+Delete（Mac）
```

### Q: 部署后资源 404？

A: 这是 base 路径问题的征兆。确认：

1. `vite.config.ts` 中有 `base: '/caixinweekly/'`
2. 重新构建并推送
3. 等待 3-5 分钟让 GitHub Pages 更新

---

## 📚 参考资源

- [Vite 官方文档 - base](https://vitejs.dev/config/#base)
- [GitHub Pages 官方文档](https://docs.github.com/en/pages)
- [Vite React 部署指南](https://vitejs.dev/guide/static-deploy.html#github-pages)

---

## 🎯 总结

| 步骤 | 命令 | 说明 |
|------|------|------|
| 1 | `npm run build` | 本地重新构建 |
| 2 | `git push origin main` | 推送到 GitHub |
| 3 | 等待自动部署 | GitHub Actions 自动构建和部署 |
| 4 | 访问网站 | https://siyuanjia.github.io/caixinweekly/ |

**预期结果：** 白屏消失，网站正常加载！✨


