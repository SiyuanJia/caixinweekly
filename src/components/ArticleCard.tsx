import React, { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { Article } from '@/lib/db'
import { getFirstSentence, aiTextToHtml } from '@/lib/utils'
import { Sparkles, Lightbulb, Info, X, ChevronRight } from 'lucide-react'
import ShareButton from './ShareButton'

interface ArticleCardProps {
  article: Article
  issueId: number | string
}

export default function ArticleCard({ article, issueId }: ArticleCardProps) {
  const navigate = useNavigate()
  const [isHovered, setIsHovered] = useState(false)
  const [imageError, setImageError] = useState(false)
  const cardRef = React.useRef<HTMLDivElement>(null)
  const hoverTimerRef = React.useRef<number | null>(null)
  const [popoverPos, setPopoverPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 })
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const updatePopoverPosition = useCallback(() => {
    const el = cardRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    
    if (isMobile) {
      // 移动端：卡片下方展示，使用绝对定位（相对于 document）
      setPopoverPos({
        top: rect.bottom + window.scrollY + 8,
        left: rect.left + window.scrollX
      })
    } else {
      // PC端：卡片右侧展示，使用视口坐标（fixed定位）
      const desiredWidth = 380
      const gap = 12
      const maxLeft = window.innerWidth - desiredWidth - 16

      const left = Math.min(rect.right + gap, maxLeft)
      const top = Math.max(16, Math.min(rect.top, window.innerHeight - 16))
      setPopoverPos({ top, left })
    }
  }, [isMobile])

  const openPopover = useCallback(() => {
    if (hoverTimerRef.current) window.clearTimeout(hoverTimerRef.current)
    setIsHovered(true)
    // 延迟一帧确保 DOM 已更新
    requestAnimationFrame(() => {
      updatePopoverPosition()
    })
  }, [updatePopoverPosition])

  const closePopover = useCallback(() => {
    if (hoverTimerRef.current) window.clearTimeout(hoverTimerRef.current)
    hoverTimerRef.current = window.setTimeout(() => setIsHovered(false), 120)
  }, [])

  useEffect(() => {
    if (!isHovered) return
    
    // 立即更新位置
    updatePopoverPosition()
    
    const onScroll = () => {
      updatePopoverPosition()
    }
    const onResize = () => {
      updatePopoverPosition()
    }
    
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onResize)
    
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onResize)
    }
  }, [isHovered, updatePopoverPosition])

  const handleClick = () => {
    navigate(`/reader?issue=${issueId}&page=${article.pageNumber}`)
  }

  const handleMobileToggle = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    if (isHovered) {
      setIsHovered(false)
    } else {
      openPopover()
    }
  }, [isHovered, openPopover])

  const firstSentence = article.aiSummary 
    ? getFirstSentence(article.aiSummary)
    : '精彩内容，值得一读'

  return (
    <motion.article
      ref={cardRef}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -8, transition: { duration: 0.2 } }}
      onClick={handleClick}
      className="bg-white rounded-xl shadow-sm hover:shadow-xl transition-shadow cursor-pointer overflow-visible group relative"
    >
      {/* 文章封面图 */}
      <div className="relative aspect-video overflow-hidden bg-gradient-to-br from-caixin-navy to-caixin-navy-light">
        {!imageError && article.coverImageUrl ? (
          <img
            src={article.coverImageUrl}
            alt={article.title}
            onError={() => setImageError(true)}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-caixin-gold text-6xl font-bold opacity-20">
              财新
            </div>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        
        {/* 文章序号角标 */}
        <div className="absolute top-4 left-4 bg-caixin-gold text-caixin-navy px-3 py-1 rounded-full text-sm font-bold">
          {article.order + 1}
        </div>
      </div>

      {/* 文章信息 */}
      <div className="p-5 space-y-3">
        <h3 className="text-lg font-bold text-caixin-navy line-clamp-2 group-hover:text-caixin-gold transition-colors">
          {article.title}
        </h3>

        {/* AI洞察 */}
        {article.aiSummary && (
          <div className="relative">
            <div 
              className="flex items-center space-x-2 text-sm text-gray-600 cursor-pointer"
              onMouseEnter={isMobile ? undefined : openPopover}
              onMouseLeave={isMobile ? undefined : closePopover}
              onClick={isMobile ? handleMobileToggle : undefined}
            >
              <Sparkles className="w-4 h-4 text-caixin-gold flex-shrink-0" />
              <p className="line-clamp-1 flex-1">{firstSentence}</p>
              {isMobile && (
                <ChevronRight className="w-4 h-4 text-caixin-gold flex-shrink-0" />
              )}
            </div>
          </div>
        )}

        {/* 页码信息和分享 */}
        <div className="flex items-center justify-between text-xs text-gray-400 pt-2 border-t border-gray-100">
          <span>第 {article.pageNumber} 页</span>
          <div className="flex items-center space-x-2">
            <ShareButton
              url={`${window.location.origin}/reader?issue=${issueId}&page=${article.pageNumber}`}
              title="复制文章链接"
            />
            <span className="text-caixin-gold group-hover:translate-x-1 transition-transform inline-block">
              阅读全文 →
            </span>
          </div>
        </div>
      </div>

      {/* AI弹窗 - 现代化设计，支持移动端 */}
      {isHovered && article.aiSummary && article.aiInsight && cardRef.current && createPortal(
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          className={`${isMobile ? 'absolute' : 'fixed'} z-[9999] bg-white rounded-lg shadow-2xl popover-scrollbar`}
          style={{
            top: `${popoverPos.top}px`,
            left: `${popoverPos.left}px`,
            width: isMobile ? `${cardRef.current?.offsetWidth || 300}px` : `380px`,
            maxHeight: isMobile ? '70vh' : '60vh',
            overflowY: 'auto',
            border: '2px solid transparent',
            backgroundImage: 'linear-gradient(white, white), linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            backgroundOrigin: 'border-box',
            backgroundClip: 'padding-box, border-box',
            boxShadow: '0 0 20px rgba(102, 126, 234, 0.3), 0 10px 40px rgba(0,0,0,0.2)'
          }}
          onClick={(e) => e.stopPropagation()}
          onMouseEnter={isMobile ? undefined : openPopover}
          onMouseLeave={isMobile ? undefined : closePopover}
        >
          {/* 关闭按钮 - 移动端显示 */}
          {isMobile && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                setIsHovered(false)
              }}
              className="absolute top-2 right-2 p-1 z-10 text-indigo-600 hover:text-indigo-800 transition-colors"
              aria-label="关闭"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <div className="p-4 space-y-3">
            <div>
              <div className="flex items-center space-x-2 mb-1.5">
                <Sparkles className="w-4 h-4 text-caixin-gold" />
                <p className="text-xs font-bold text-caixin-navy uppercase tracking-wide">AI摘要</p>
              </div>
              <div 
                className="text-xs text-gray-700 leading-relaxed pl-6"
                dangerouslySetInnerHTML={{ __html: aiTextToHtml(article.aiSummary) }}
              />
            </div>
            <div className="border-t border-purple-100 pt-3">
              <div className="flex items-center space-x-2 mb-1.5">
                <Lightbulb className="w-4 h-4 text-caixin-gold" />
                <p className="text-xs font-bold text-caixin-navy uppercase tracking-wide">核心洞察</p>
              </div>
              <div 
                className="text-xs text-gray-700 leading-relaxed pl-6"
                dangerouslySetInnerHTML={{ __html: aiTextToHtml(article.aiInsight) }}
              />
            </div>
            
            {/* 免责声明 */}
            {article.disclaimer && (
              <div className="border-t border-gray-200 pt-2 mt-3">
                <div className="flex items-start space-x-1.5">
                  <Info className="w-3 h-3 text-gray-400 mt-0.5 flex-shrink-0" />
                  <p className="text-[10px] text-gray-400 leading-relaxed">
                    {article.disclaimer}
                  </p>
                </div>
              </div>
            )}
          </div>
        </motion.div>,
        document.body
      )}
    </motion.article>
  )
}
