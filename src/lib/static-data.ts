/**
 * 静态数据加载模块
 * 用于从预生成的JSON文件加载周刊数据
 */

import { getOssUrl, OSS_CONFIG } from './oss-config'

export interface StaticIssue {
  id: string
  title: string
  publishDate: string
  pdfUrl: string // PDF文件的URL路径
  coverImage?: string
  articles: StaticArticle[]
}

export interface StaticArticle {
  id: string
  title: string
  pageNumber: number
  coverImage: string
  summary: string // AI生成的摘要
  insight: string // AI生成的洞察
  order: number
  disclaimer?: string // 免责声明（可选）
}

/**
 * 从静态JSON文件加载期次列表
 */
export async function loadIssues(): Promise<StaticIssue[]> {
  try {
    const url = getOssUrl(OSS_CONFIG.paths.issues)
    console.log('[Static] 加载期次列表:', url)
    
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`加载期次数据失败: ${response.status}`)
    }
    return await response.json()
  } catch (error) {
    console.error('加载期次数据失败:', error)
    return []
  }
}

/**
 * 加载指定期次的详细数据
 */
export async function loadIssueDetail(issueId: string): Promise<StaticIssue | null> {
  try {
    const url = getOssUrl(OSS_CONFIG.paths.issueDetail(issueId))
    console.log('[Static] 加载期次详情:', url)
    
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`加载期次详情失败: ${response.status}`)
    }
    return await response.json()
  } catch (error) {
    console.error('加载期次详情失败:', error)
    return null
  }
}

/**
 * 生成模拟数据（用于测试）
 */
export function generateMockIssue(pdfFile: File, outline: any[]): StaticIssue {
  const issueId = pdfFile.name.replace('.pdf', '').replace(/\s+/g, '-')
  const issueTitle = pdfFile.name.replace('.pdf', '')
  
  const articles: StaticArticle[] = outline.map((item, index) => ({
    id: `${issueId}-article-${index}`,
    title: item.title,
    pageNumber: item.pageNumber,
    coverImage: generateMockCoverImage(index),
    summary: generateMockSummary(),
    insight: generateMockInsight(),
    order: index,
  }))

  return {
    id: issueId,
    title: issueTitle,
    publishDate: new Date().toISOString(),
    pdfUrl: URL.createObjectURL(pdfFile),
    articles,
  }
}

/**
 * 生成模拟封面图
 */
function generateMockCoverImage(index: number): string {
  const themes = [
    'business', 'finance', 'technology', 'politics', 
    'economy', 'city', 'people', 'innovation'
  ]
  const theme = themes[index % themes.length]
  // 使用更稳定的图片源
  return `https://picsum.photos/seed/${theme}-${index}/800/600`
}

/**
 * 生成模拟摘要
 */
function generateMockSummary(): string {
  const summaries = [
    '这篇文章深入分析了当前经济形势下的关键趋势，为读者提供了独到的视角和洞察。',
    '通过详实的数据和案例，文章揭示了行业发展的内在逻辑和未来走向。',
    '作者从多个维度剖析了热点问题，提出了具有前瞻性的观点和建议。',
    '文章聚焦重大政策变化，分析其对市场和企业的深远影响。',
    '通过对标杆企业的深度调研，展现了创新发展的成功路径。',
    '文章探讨了技术变革如何重塑产业格局，为决策者提供参考。',
    '基于大量一线调查，文章还原了事件的来龙去脉和背后逻辑。',
    '作者以独特视角观察社会现象，引发对深层问题的思考。',
  ]
  return summaries[Math.floor(Math.random() * summaries.length)]
}

/**
 * 生成模拟洞察
 */
function generateMockInsight(): string {
  const insights = [
    '核心洞察：市场正在经历结构性转变，传统模式面临挑战，新兴领域蕴含机遇。建议关注政策导向和技术创新的交汇点。',
    '关键发现：监管政策收紧背后，是行业走向规范化的必然趋势。企业需要提前布局，将合规优势转化为竞争力。',
    '深度解读：资本市场波动反映了投资者对未来预期的分歧。理性分析基本面，把握长期价值投资机会。',
    '趋势判断：数字化转型不再是选择题，而是生存题。领先企业已在构建新的护城河，落后者将面临淘汰风险。',
    '战略启示：在不确定性中寻找确定性，聚焦核心能力建设，保持战略定力和战术灵活性。',
    '前瞻分析：全球产业链重构为中国企业带来新的定位机会，需要在技术自主和国际合作间找到平衡。',
    '重要信号：政策风向已经明确，相关产业将迎来黄金发展期。提前布局者将获得先发优势。',
    '底层逻辑：看似独立的现象背后，是更深层次的系统性变化。把握主要矛盾，才能做出正确判断。',
  ]
  return insights[Math.floor(Math.random() * insights.length)]
}

