import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { ChevronDown, BookOpen } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '@/lib/store'
import ArticleCard from '@/components/ArticleCard'
import ConfigModal from '@/components/ConfigModal'
import LoadingSpinner from '@/components/LoadingSpinner'
import { loadIssueDetail, type StaticIssue, type StaticArticle } from '@/lib/static-data'

export default function HomePage() {
  const navigate = useNavigate()
  const { setIsConfigOpen } = useAppStore()
  const [isLoading, setIsLoading] = useState(true)
  const [issueData, setIssueData] = useState<StaticIssue | null>(null)
  const [articles, setArticles] = useState<StaticArticle[]>([])

  useEffect(() => {
    loadStaticData()
  }, [])

  const loadStaticData = async () => {
    try {
      setIsLoading(true)
      // 加载第 40 期数据（硬编码，后续可改为动态）
      const data = await loadIssueDetail('2025-40')
      
      if (data) {
        console.log('[HomePage] 加载静态数据成功:', data)
        setIssueData(data)
        setArticles(data.articles)
      } else {
        console.warn('[HomePage] 未找到静态数据')
      }
    } catch (error) {
      console.error('[HomePage] 加载数据失败:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleViewFullText = () => {
    if (issueData) {
      // 使用静态 PDF URL
      window.open(issueData.pdfUrl, '_blank')
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <LoadingSpinner text="加载中..." />
      </div>
    )
  }

  if (!issueData) {
    return (
      <>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-20"
        >
          <BookOpen className="w-20 h-20 mx-auto mb-6 text-gray-300" />
          <h2 className="text-2xl font-bold text-gray-700 mb-3">欢迎使用财新Weekly</h2>
          <p className="text-gray-500 mb-8">未找到周刊数据，请检查 public/data/ 目录</p>
          <button
            onClick={() => setIsConfigOpen(true)}
            className="px-8 py-3 bg-caixin-gold text-caixin-navy rounded-lg font-medium hover:bg-caixin-gold-light transition-colors"
          >
            打开配置
          </button>
        </motion.div>
        <ConfigModal />
      </>
    )
  }

  return (
    <>
      <div className="space-y-8">
        {/* 期次标题和操作栏 - 极简设计 */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between px-1 py-3 border-b-2 border-caixin-navy/10"
        >
          <div className="flex items-center space-x-3">
            <span className="text-xs text-gray-500 font-medium">当前期次</span>
            <h2 className="text-caixin-navy px-4 py-1 border-b-2 border-caixin-gold font-semibold">
              {issueData.title}
            </h2>
          </div>

          <button
            onClick={handleViewFullText}
            className="text-sm text-caixin-navy hover:text-caixin-gold transition-colors font-medium flex items-center space-x-1 group"
          >
            <BookOpen className="w-4 h-4" />
            <span>查看 PDF</span>
            <span className="group-hover:translate-x-1 transition-transform">→</span>
          </button>
        </motion.div>

        {/* 文章列表 */}
        {articles.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {articles.map((article) => (
              <ArticleCard
                key={article.id}
                article={{
                  id: 0, // 临时 ID
                  issueId: 0,
                  title: article.title,
                  pageNumber: article.pageNumber,
                  order: article.order,
                  coverImageUrl: article.coverImage,
                  aiSummary: article.summary,
                  aiInsight: article.insight,
                  disclaimer: article.disclaimer,
                }}
                issueId={issueData.id}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-20 bg-white rounded-xl">
            <p className="text-gray-500">本期暂无文章内容</p>
          </div>
        )}
      </div>

      <ConfigModal />
    </>
  )
}

