import Dexie, { Table } from 'dexie'

export interface Issue {
  id?: number
  title: string // PDF文件名，如 "财新周刊2025第40期"
  uploadDate: Date
  pdfBlob: Blob
  thumbnailUrl?: string
}

export interface Article {
  id?: number
  issueId: number // 关联到Issue
  title: string // 文章标题
  pageNumber: number // 文章起始页码
  coverImageUrl?: string // 文章封面图（占位图或提取的）
  aiSummary?: string // Gemini生成的摘要
  aiInsight?: string // Gemini生成的洞察
  order: number // 文章在目录中的顺序
  disclaimer?: string // 免责声明（可选）
}

export interface AppSettings {
  id?: number
  geminiApiKey?: string
  lastSelectedIssueId?: number
}

class CaixinWeeklyDB extends Dexie {
  issues!: Table<Issue>
  articles!: Table<Article>
  settings!: Table<AppSettings>

  constructor() {
    super('CaixinWeeklyDB')
    this.version(1).stores({
      issues: '++id, title, uploadDate',
      articles: '++id, issueId, title, pageNumber, order',
      settings: '++id',
    })
  }
}

export const db = new CaixinWeeklyDB()

// 初始化默认设置
export async function initializeSettings() {
  const count = await db.settings.count()
  if (count === 0) {
    await db.settings.add({
      geminiApiKey: '',
      lastSelectedIssueId: undefined,
    })
  }
}

// 获取设置
export async function getSettings(): Promise<AppSettings> {
  let settings = await db.settings.toCollection().first()
  if (!settings) {
    await initializeSettings()
    settings = await db.settings.toCollection().first()
  }
  return settings!
}

// 更新设置
export async function updateSettings(updates: Partial<AppSettings>) {
  const settings = await getSettings()
  if (settings.id) {
    await db.settings.update(settings.id, updates)
  }
}

