import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * 格式化日期
 */
export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date)
}

/**
 * 提取PDF文件名中的期数信息
 */
export function extractIssueNumber(filename: string): string {
  const match = filename.match(/第(\d+)期/)
  return match ? `第${match[1]}期` : filename
}

/**
 * 截取文本到指定长度
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength) + '...'
}

/**
 * 从摘要中提取第一句话
 */
export function getFirstSentence(text: string): string {
  const match = text.match(/^[^。！？.!?]+[。！？.!?]/)
  return match ? match[0] : truncateText(text, 50)
}

/**
 * 将AI返回的常见格式转为安全的HTML片段，支持：
 * - 换行 -> <br/>
 * - **加粗** -> <strong>
 * - 无序列表 (- / * 开头的行)
 * - 有序列表 (1. 2. 开头的行)
 *
 * 注意：先进行HTML转义再做简单的markdown替换，避免注入风险
 */
export function aiTextToHtml(input: string): string {
  if (!input) return ''
  // 基本转义
  const escapeHtml = (s: string) =>
    s.replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
  const text = escapeHtml(input.trim())

  // 分块处理列表
  const lines = text.split(/\r?\n/)
  const htmlParts: string[] = []
  let buffer: string[] = []
  let listType: 'ul' | 'ol' | null = null

  const flushParagraph = () => {
    if (buffer.length > 0) {
      const paragraph = buffer.join('<br/>')
      htmlParts.push(`<p>${paragraph}</p>`)
      buffer = []
    }
  }
  const flushList = () => {
    if (listType) {
      const items = buffer.map(li => `<li>${li}</li>`).join('')
      htmlParts.push(`<${listType}>${items}</${listType}>`)
      buffer = []
      listType = null
    }
  }

  const boldRe = /\*\*([^*]+)\*\*/g

  for (const raw of lines) {
    const line = raw.replace(boldRe, '<strong>$1</strong>').trim()
    if (/^(\-|\*)\s+/.test(line)) {
      // 无序列表
      if (listType === 'ol') {
        flushList()
      }
      listType = 'ul'
      buffer.push(line.replace(/^(\-|\*)\s+/, ''))
    } else if (/^\d+\.\s+/.test(line)) {
      // 有序列表
      if (listType === 'ul') {
        flushList()
      }
      listType = 'ol'
      buffer.push(line.replace(/^\d+\.\s+/, ''))
    } else if (line === '') {
      // 空行：结束当前段落或列表
      if (listType) {
        flushList()
      } else {
        flushParagraph()
      }
    } else {
      // 普通段落行
      if (listType) {
        // 列表中遇到普通行，认为列表结束，作为新段落开始
        flushList()
      }
      buffer.push(line)
    }
  }
  // 收尾
  if (listType) flushList()
  if (buffer.length) flushParagraph()

  return htmlParts.join('')
}

