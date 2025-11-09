import * as pdfjsLib from 'pdfjs-dist'

// 设置 PDF.js worker（新版本使用.mjs格式）
const workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString()

pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc
console.log('PDF.js worker已配置')

export interface PDFOutlineItem {
  title: string
  pageNumber: number
  items?: PDFOutlineItem[]
}

export interface ParsedPDFData {
  outline: PDFOutlineItem[]
  totalPages: number
  pdfDocument: pdfjsLib.PDFDocumentProxy
}

/**
 * 解析PDF文件，提取目录书签
 */
export async function parsePDF(file: Blob): Promise<ParsedPDFData> {
  try {
    console.log('开始解析PDF，文件大小:', (file.size / 1024 / 1024).toFixed(2), 'MB')
    
    const arrayBuffer = await file.arrayBuffer()
    console.log('ArrayBuffer加载完成，开始加载PDF文档...')
    
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer })
    const pdfDocument = await loadingTask.promise
    console.log('PDF文档加载完成，总页数:', pdfDocument.numPages)

    // 获取目录大纲
    console.log('开始提取目录书签...')
    const outline = await pdfDocument.getOutline()
    console.log('原始书签数量:', outline?.length || 0)
    
    const parsedOutline = await parseOutline(pdfDocument, outline || [])
    console.log('解析后文章数量:', parsedOutline.length)

    return {
      outline: parsedOutline,
      totalPages: pdfDocument.numPages,
      pdfDocument,
    }
  } catch (error) {
    console.error('PDF解析失败:', error)
    throw new Error('PDF解析失败，请确保文件格式正确')
  }
}

/**
 * 递归解析PDF大纲
 */
async function parseOutline(
  pdfDocument: pdfjsLib.PDFDocumentProxy,
  outline: any[]
): Promise<PDFOutlineItem[]> {
  const result: PDFOutlineItem[] = []

  for (const item of outline) {
    try {
      // 获取目标页码
      let pageNumber = 1
      if (item.dest) {
        const dest = typeof item.dest === 'string' 
          ? await pdfDocument.getDestination(item.dest)
          : item.dest
        
        if (dest && dest[0]) {
          const pageIndex = await pdfDocument.getPageIndex(dest[0])
          pageNumber = pageIndex + 1 // PDF页码从1开始
        }
      }

      const parsedItem: PDFOutlineItem = {
        title: item.title,
        pageNumber,
      }

      // 递归解析子项
      if (item.items && item.items.length > 0) {
        parsedItem.items = await parseOutline(pdfDocument, item.items)
      }

      result.push(parsedItem)
    } catch (error) {
      console.warn('解析目录项失败:', item.title, error)
    }
  }

  return result
}

/**
 * 从PDF页面提取文本内容
 */
export async function extractTextFromPage(
  pdfDocument: pdfjsLib.PDFDocumentProxy,
  pageNumber: number
): Promise<string> {
  try {
    const page = await pdfDocument.getPage(pageNumber)
    const textContent = await page.getTextContent()
    const text = textContent.items
      .map((item: any) => item.str)
      .join(' ')
    return text
  } catch (error) {
    console.error(`提取第${pageNumber}页文本失败:`, error)
    return ''
  }
}

/**
 * 提取文章内容（从起始页到下一篇文章或结束）
 */
export async function extractArticleContent(
  pdfDocument: pdfjsLib.PDFDocumentProxy,
  startPage: number,
  endPage: number
): Promise<string> {
  const texts: string[] = []
  
  for (let i = startPage; i <= Math.min(endPage, pdfDocument.numPages); i++) {
    const text = await extractTextFromPage(pdfDocument, i)
    texts.push(text)
  }
  
  return texts.join('\n\n')
}

/**
 * 生成占位图URL（使用Unsplash随机图片）
 */
export function generatePlaceholderImage(index: number): string {
  const themes = [
    'business,finance',
    'technology,innovation',
    'politics,government',
    'economy,market',
    'city,architecture',
    'people,culture',
  ]
  
  const theme = themes[index % themes.length]
  return `https://images.unsplash.com/photo-${1500000000000 + index * 100000}?w=800&h=600&fit=crop&q=80&${theme}`
}

/**
 * 获取随机高质量的Unsplash图片
 */
export function getUnsplashPlaceholder(seed: string): string {
  // 使用文章标题作为seed，保证同一篇文章总是获得相同的图片
  const hash = seed.split('').reduce((acc, char) => {
    return char.charCodeAt(0) + ((acc << 5) - acc)
  }, 0)
  
  const imageId = Math.abs(hash) % 1000 + 1
  
  return `https://source.unsplash.com/800x600/?business,news&sig=${imageId}`
}

/**
 * 从 IndexedDB 获取 outline 数据
 */
export async function getOutlineFromIndexedDB(issueId: string): Promise<any | null> {
  try {
    const { db } = await import('./db')
    
    // 如果 issueId 是文件名格式（如 "财新周刊2025第40期"），尝试查找
    let issue = await db.issues.where('id').equals(issueId).first()
    
    // 如果没找到，尝试通过标题模糊匹配
    if (!issue) {
      const allIssues = await db.issues.toArray()
      issue = allIssues.find(i => 
        i.title.includes(issueId) || 
        issueId.includes(i.title)
      )
    }
    
    // 如果还是没找到，使用最新的一期
    if (!issue) {
      const issues = await db.issues.orderBy('uploadDate').reverse().toArray()
      issue = issues[0]
    }
    
    if (!issue) {
      console.warn('未找到期次数据:', issueId)
      return null
    }
    
    // 获取该期的所有文章
    const articles = await db.articles
      .where('issueId')
      .equals(issue.id!)
      .sortBy('order')
    
    // 构建 outline JSON 格式
    const outline = {
      issueTitle: issue.title,
      outline: articles.map(article => ({
        title: article.title,
        pageNumber: article.pageNumber,
        order: article.order
      }))
    }
    
    console.log('[PDF Parser] 从 IndexedDB 导出 outline:', outline)
    return outline
  } catch (error) {
    console.error('从 IndexedDB 获取 outline 失败:', error)
    return null
  }
}

