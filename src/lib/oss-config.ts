/**
 * OSS 配置
 * 
 * 生产环境：从 OSS 加载静态 JSON 和 PDF
 * 开发环境：使用本地 IndexedDB
 */

export const OSS_CONFIG = {
  // OSS 基础 URL
  baseUrl: 'https://caixinweekly.oss-cn-hongkong.aliyuncs.com',
  
  // 是否启用 OSS（暂时禁用，使用 public/ 静态文件）
  enabled: false,  // import.meta.env.PROD || import.meta.env.VITE_USE_OSS === 'true',
  
  // 数据路径
  paths: {
    issues: '/data/issues.json',  // 期次列表
    issueDetail: (issueId: string) => `/data/issues/${issueId}.json`,  // 期次详情
    pdf: (issueId: string) => `/data/pdfs/${issueId}.pdf`,  // PDF 文件
    markdown: (issueId: string) => `/data/markdown/${issueId}.md`,  // Markdown（可选）
  }
}

/**
 * 获取完整的 OSS URL
 */
export function getOssUrl(path: string): string {
  // 计算基础路径：优先使用 Vite 的 BASE_URL（支持 GitHub Pages 子路径）
  // 计算运行时 base 前缀，优先使用 Vite BASE_URL；否则从 <base> 或当前路径推断
  const viteMeta: any = (typeof import.meta !== 'undefined') ? (import.meta as any) : {}
  let base: string | undefined = (viteMeta && viteMeta.env && viteMeta.env.BASE_URL)
    ? (viteMeta.env.BASE_URL as string)
    : undefined

  if (!base && typeof window !== 'undefined') {
    const baseHref = document.querySelector('base')?.getAttribute('href')
    if (baseHref) {
      try {
        base = new URL(baseHref, window.location.origin).pathname
      } catch { /* ignore */ }
    }
    if (!base) {
      // 推断第一个路径段作为子路径前缀（支持 GitHub Pages /repo-name/）
      const seg = window.location.pathname.split('/').filter(Boolean)[0]
      base = seg ? `/${seg}/` : '/'
    }
  }
  if (!base) base = '/'

  if (!OSS_CONFIG.enabled) {
    // 本地/静态部署：返回带 base 的相对路径，例如 /caixinweekly/data/...
    const clean = path.startsWith('/') ? path : `/${path}`
    const baseClean = base.endsWith('/') ? base.slice(0, -1) : base
    return `${baseClean}${clean}`
  }

  // OSS 部署：返回完整 OSS URL
  const cleanPath = path.startsWith('/') ? path.slice(1) : path
  return `${OSS_CONFIG.baseUrl}/${cleanPath}`
}

/**
 * 测试 OSS 连通性
 */
export async function testOssConnection(): Promise<boolean> {
  try {
    const url = getOssUrl(OSS_CONFIG.paths.issues)
    console.log('[OSS] 测试连通性:', url)
    
    const response = await fetch(url, { method: 'HEAD' })
    const isOk = response.ok
    
    console.log('[OSS] 连通性测试结果:', isOk ? '✅ 成功' : '❌ 失败', response.status)
    return isOk
  } catch (error) {
    console.error('[OSS] 连通性测试失败:', error)
    return false
  }
}

