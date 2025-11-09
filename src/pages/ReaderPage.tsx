import { useEffect, useState, useRef } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { motion } from 'framer-motion'
import * as pdfjsLib from 'pdfjs-dist'
import { db } from '@/lib/db'
import { loadIssueDetail } from '@/lib/static-data'
import LoadingSpinner from '@/components/LoadingSpinner'

export default function ReaderPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const issueParam = searchParams.get('issue')
  const targetPage = Number(searchParams.get('page')) || 1

  const [isLoading, setIsLoading] = useState(true)
  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null)
  const [currentPage, setCurrentPage] = useState(targetPage)
  const [totalPages, setTotalPages] = useState(0)
  const [scale, setScale] = useState(typeof window !== 'undefined' && window.innerWidth < 640 ? 1.0 : 1.5)
  
  const canvasContainerRef = useRef<HTMLDivElement>(null)
  const canvasRefs = useRef<Map<number, HTMLCanvasElement>>(new Map())
  const loadingRef = useRef(false)

  useEffect(() => {
    loadPDF()
  }, [issueParam])

  const loadPDF = async () => {
    try {
      if (loadingRef.current) {
        console.log('检测到并发加载，已跳过本次 loadPDF 调用')
        return
      }
      loadingRef.current = true

      // 尝试从IndexedDB加载
      const issueId = Number(issueParam)
      let pdfBlob: Blob | null = null
      
      if (!isNaN(issueId)) {
        const issue = await db.issues.get(issueId)
        if (issue?.pdfBlob) {
          pdfBlob = issue.pdfBlob
        }
      }

      // 如果IndexedDB没有，尝试加载静态文件
      if (!pdfBlob && issueParam) {
        try {
          const staticIssue = await loadIssueDetail(issueParam)
          if (staticIssue?.pdfUrl) {
            const response = await fetch(staticIssue.pdfUrl)
            if (response.ok) {
              pdfBlob = await response.blob()
            }
          }
        } catch (e) {
          console.warn('加载静态PDF失败，尝试默认路径')
        }
      }

      // 最后尝试默认路径
      if (!pdfBlob && issueParam) {
        try {
          const response = await fetch(`/data/pdfs/${issueParam}.pdf`)
          if (response.ok) {
            pdfBlob = await response.blob()
          }
        } catch (e) {
          console.error('加载默认PDF路径失败')
        }
      }

      if (!pdfBlob) {
        throw new Error('未找到PDF文件')
      }

      console.log('开始加载PDF...')
      const arrayBuffer = await pdfBlob.arrayBuffer()
      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer })
      const pdf = await loadingTask.promise

      console.log('PDF加载完成，总页数:', pdf.numPages)

      if (canvasContainerRef.current) {
        canvasContainerRef.current.innerHTML = ''
      }
      canvasRefs.current.clear()
      setPdfDoc(pdf)
      setTotalPages(pdf.numPages)
      setIsLoading(false)

      if (targetPage) {
        console.log('按需渲染模式：目标页面', targetPage)
        await renderPagesAround(pdf, targetPage)
      } else {
        console.log('渲染前5页')
        await renderPagesAround(pdf, 1, 5)
      }
    } catch (error) {
      console.error('加载PDF失败:', error)
      setIsLoading(false)
    } finally {
      loadingRef.current = false
    }
  }

  const renderPagesAround = async (pdf: pdfjsLib.PDFDocumentProxy, centerPage: number, range: number = 10) => {
    const startPage = Math.max(1, centerPage - range)
    const endPage = Math.min(pdf.numPages, centerPage + range)
    
    console.log(`渲染页面范围: ${startPage} - ${endPage}，目标页: ${centerPage}`)
    
    await renderPage(pdf, centerPage)
    console.log(`✅ 目标页 ${centerPage} 渲染完成`)
    
    setTimeout(() => {
      console.log('立即跳转到目标页:', centerPage)
      const success = scrollToPage(centerPage, false)
      if (success) {
        console.log('✅ 跳转成功')
      }
    }, 100)
    
    setTimeout(async () => {
      console.log('开始渲染周围页面...')
      for (let pageNum = centerPage + 1; pageNum <= endPage; pageNum++) {
        await renderPage(pdf, pageNum)
      }
      console.log(`✅ 周围页面渲染完成 (${startPage}-${endPage})`)
      
      // 继续渲染剩余页面（懒加载）
      if (endPage < pdf.numPages) {
        console.log('开始懒加载剩余页面...')
        for (let pageNum = endPage + 1; pageNum <= pdf.numPages; pageNum++) {
          await renderPage(pdf, pageNum)
          if (pageNum % 10 === 0) {
            console.log(`懒加载进度: ${pageNum}/${pdf.numPages}`)
          }
        }
        console.log('✅ 全部页面加载完成')
      }
    }, 200)
  }

  const renderPage = async (pdf: pdfjsLib.PDFDocumentProxy, pageNum: number): Promise<number | null> => {
    try {
      if (canvasRefs.current.has(pageNum)) {
        console.log(`页面${pageNum}已存在，跳过`)
        return null
      }

      const page = await pdf.getPage(pageNum)
      const viewport = page.getViewport({ scale })

      const canvas = document.createElement('canvas')
      const context = canvas.getContext('2d')
      if (!context) return null

      canvas.width = viewport.width
      canvas.height = viewport.height
      canvas.className = 'pdf-canvas shadow-md max-w-full h-auto'
      canvas.id = `page-${pageNum}`

      await page.render({
        canvasContext: context,
        viewport: viewport,
      }).promise

      canvasRefs.current.set(pageNum, canvas)

      if (canvasContainerRef.current) {
        const pageContainer = document.createElement('div')
        pageContainer.className = 'page-container mb-4 md:mb-6'
        pageContainer.setAttribute('data-page', String(pageNum))

        const pageLabel = document.createElement('div')
        pageLabel.className = 'text-center text-xs text-gray-500 mb-1'
        pageLabel.textContent = `第 ${pageNum} / ${pdf.numPages} 页`

        pageContainer.appendChild(pageLabel)
        pageContainer.appendChild(canvas)
        
        const existingPages = Array.from(canvasContainerRef.current.querySelectorAll('[data-page]'))
        const insertIndex = existingPages.findIndex(el => {
          const existingPageNum = Number(el.getAttribute('data-page'))
          return existingPageNum > pageNum
        })
        
        if (insertIndex === -1) {
          canvasContainerRef.current.appendChild(pageContainer)
        } else {
          canvasContainerRef.current.insertBefore(pageContainer, existingPages[insertIndex])
        }

        const rect = pageContainer.getBoundingClientRect()
        const height = rect.height
        return height
      }
    } catch (error) {
      console.error(`渲染第${pageNum}页失败:`, error)
    }
    return null
  }

  const scrollToPage = (pageNum: number, smooth: boolean = true): boolean => {
    console.log('尝试滚动到页面:', pageNum)
    const pageElement = document.querySelector(`[data-page="${pageNum}"]`)
    
    if (pageElement) {
      console.log('✅ 找到页面元素，开始滚动')
      const elementTop = pageElement.getBoundingClientRect().top + window.pageYOffset
      const offsetPosition = elementTop - 80
      
      window.scrollTo({
        top: offsetPosition,
        behavior: smooth ? 'smooth' : 'auto'
      })
      
      setCurrentPage(pageNum)
      return true
    } else {
      console.error('❌ 未找到页面元素:', pageNum)
      console.log('当前DOM中的所有页面:', 
        Array.from(document.querySelectorAll('[data-page]')).map(el => el.getAttribute('data-page'))
      )
      return false
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <LoadingSpinner text="正在加载PDF..." size="lg" />
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto">
      {/* 简化工具栏 - 仅保留返回目录 */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="fixed top-20 left-4 z-40"
      >
        <button
          onClick={() => navigate('/')}
          className="flex items-center space-x-2 px-4 py-2 bg-white rounded-lg shadow-lg text-caixin-navy hover:bg-gray-50 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="hidden sm:inline">返回目录</span>
        </button>
      </motion.div>

      {/* PDF内容 - 移动端优化布局 */}
      <div
        ref={canvasContainerRef}
        className="bg-gray-100 rounded-xl p-2 md:p-8 overflow-x-auto"
      />
    </div>
  )
}

