import { create } from 'zustand'
import { Issue, Article } from './db'

interface AppState {
  // 当前选中的期次
  selectedIssue: Issue | null
  setSelectedIssue: (issue: Issue | null) => void
  
  // 当前期次的文章列表
  articles: Article[]
  setArticles: (articles: Article[]) => void
  
  // 配置弹窗状态
  isConfigOpen: boolean
  setIsConfigOpen: (open: boolean) => void
  
  // 加载状态
  isLoading: boolean
  setIsLoading: (loading: boolean) => void
  
  // Gemini API Key
  geminiApiKey: string
  setGeminiApiKey: (key: string) => void
}

export const useAppStore = create<AppState>((set) => ({
  selectedIssue: null,
  setSelectedIssue: (issue) => set({ selectedIssue: issue }),
  
  articles: [],
  setArticles: (articles) => set({ articles }),
  
  isConfigOpen: false,
  setIsConfigOpen: (open) => set({ isConfigOpen: open }),
  
  isLoading: false,
  setIsLoading: (loading) => set({ isLoading: loading }),
  
  geminiApiKey: '',
  setGeminiApiKey: (key) => set({ geminiApiKey: key }),
}))

