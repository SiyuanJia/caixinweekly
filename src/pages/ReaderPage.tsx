import { useEffect, useState, useRef } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { motion } from 'framer-motion'
import * as pdfjsLib from 'pdfjs-dist'
import { db } from '@/lib/db'
import { loadIssueDetail } from '@/lib/static-data'
import LoadingSpinner from '@/components/LoadingSpinner'
import { getOssUrl } from '@/lib/oss-config'

export default function ReaderPage() {
  // 预渲染范围（目标页两侧各 N 页）
  const PRELOAD_RANGE = 2
  // 背景渲染：每批次页面数与批次间歇
  const BACKGROUND_BATCH_SIZE = 4
  const BACKGROUND_IDLE_MS = 60
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const issueParam = searchParams.get('issue')
  const targetPage = Number(searchParams.get('page')) || 1

  const [isLoading, setIsLoading] = useState(true)
  
  // 默认 scale 值
  const scale = typeof window !== 'undefined' && window.innerWidth < 640 ? 1.0 : 1.5
  
  const canvasContainerRef = useRef<HTMLDivElement>(null)
  const canvasRefs = useRef<Map<number, HTMLCanvasElement>>(new Map())
  const loadingRef = useRef(false)
  const pdfRef = useRef<pdfjsLib.PDFDocumentProxy | null>(null)
  const cancelledRef = useRef(false)

  useEffect(() => {
    cancelledRef.current = false
    loadPDF()
    return () => {
      cancelledRef.current = true
    }
  }, [issueParam])

  const loadPDF = async () => {
    try {
      if (loadingRef.current) {
        console.log('检测到并发加载，已跳过本次 loadPDF 调用')
        return
      }
      loadingRef.current = true

      // 配置 PDF.js worker，适配 GitHub Pages 子路径
      try {
        const workerUrl = getOssUrl('/pdf.worker.min.mjs')
        ;(pdfjsLib as any).GlobalWorkerOptions = (pdfjsLib as any).GlobalWorkerOptions || {}
        ;((pdfjsLib as any).GlobalWorkerOptions as any).workerSrc = workerUrl
        console.log('PDF.js worker 已设置：', workerUrl)
      } catch (_e) {
        // 忽略 worker 配置失败，PDF.js 会退回主线程渲染（较慢）
      }

      // 尝试从IndexedDB加载
      const issueId = Number(issueParam)
      let pdfBlob: Blob | null = null
      let pdfUrlForStreaming: string | null = null
      
      if (!isNaN(issueId)) {
        const issue = await db.issues.get(issueId)
        if (issue?.pdfBlob) {
          pdfBlob = issue.pdfBlob
        }
      }

      // 如果IndexedDB没有，使用静态文件 URL（交给 pdf.js 以流式/按需加载）
      if (!pdfBlob && issueParam) {
        try {
          const staticIssue = await loadIssueDetail(issueParam)
          if (staticIssue?.pdfUrl) {
            const pdfUrl = /^https?:\/\//i.test(staticIssue.pdfUrl)
              ? staticIssue.pdfUrl
              : getOssUrl(staticIssue.pdfUrl)
            pdfUrlForStreaming = pdfUrl
          }
        } catch (e) {
          console.warn('解析期次 JSON 失败，尝试默认 PDF 路径')
        }
      }

      // 最后尝试默认路径（带上 base 前缀）用于流式
      if (!pdfBlob && !pdfUrlForStreaming && issueParam) {
        try {
          const { getOssUrl, OSS_CONFIG } = await import('@/lib/oss-config')
          pdfUrlForStreaming = getOssUrl(OSS_CONFIG.paths.pdf(issueParam))
        } catch (e) {
          console.error('计算默认 PDF 路径失败')
        }
      }

      if (!pdfBlob && !pdfUrlForStreaming) {
        throw new Error('未找到PDF文件（既无本地 Blob，也无法解析 URL）')
      }

      console.log('开始加载PDF...')
      const loadingTask = pdfBlob
        ? pdfjsLib.getDocument({ data: await pdfBlob.arrayBuffer() })
        : pdfjsLib.getDocument({
            url: pdfUrlForStreaming as string,
            // 让 pdf.js 使用流式和 Range 分块请求（GitHub Pages 支持）
            disableStream: false,
            disableAutoFetch: false,
            rangeChunkSize: 65536,
            withCredentials: false,
          } as any)
      const pdf = await loadingTask.promise

      console.log('PDF加载完成，总页数:', pdf.numPages)
      pdfRef.current = pdf

      if (canvasContainerRef.current) {
        canvasContainerRef.current.innerHTML = ''
      }
      canvasRefs.current.clear()
      // setPdfDoc(pdf) // 未使用的状态
      // setTotalPages(pdf.numPages) // 未使用的状态
      setIsLoading(false)

      // 等待容器挂载完成（确保 ref 可用）
      await waitForContainerMounted()

      if (targetPage) {
        console.log('按需渲染模式：目标页面', targetPage)
        const { startPage, endPage } = await renderPagesAround(pdf, targetPage, PRELOAD_RANGE)
        // 在后台逐步渲染剩余页面（小批次，避免阻塞）
        startBackgroundRendering(pdf, startPage, endPage)
      } else {
        console.log('渲染前5页')
        const { startPage, endPage } = await renderPagesAround(pdf, 1, 5)
        startBackgroundRendering(pdf, startPage, endPage)
      }
    } catch (error) {
      console.error('加载PDF失败:', error)
      setIsLoading(false)
    } finally {
      loadingRef.current = false
    }
  }

  const waitForContainerMounted = async (): Promise<void> => {
    const MAX_RETRY = 20
    let tries = 0
    while (!canvasContainerRef.current && tries < MAX_RETRY) {
      await new Promise(r => setTimeout(r, 50))
      tries++
    }
  }

  const renderPagesAround = async (pdf: pdfjsLib.PDFDocumentProxy, centerPage: number, range: number = 2) => {
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
    
    // 仅渲染目标页附近的小范围页面，避免一次性渲染整本 PDF 阻塞
    setTimeout(async () => {
      console.log('开始渲染周围页面...')
      // 先向上，再向下，保证目标页尽快可见
      for (let pageNum = centerPage - 1; pageNum >= startPage; pageNum--) {
        if (cancelledRef.current) return
        await renderPage(pdf, pageNum)
      }
      for (let pageNum = centerPage + 1; pageNum <= endPage; pageNum++) {
        if (cancelledRef.current) return
        await renderPage(pdf, pageNum)
      }
      console.log(`✅ 周围页面渲染完成 (${startPage}-${endPage})`)
    }, 200)
    
    return { startPage, endPage }
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

  const delay = (ms: number) => new Promise(r => setTimeout(r, ms))

  const startBackgroundRendering = (pdf: pdfjsLib.PDFDocumentProxy, startPageRendered: number, endPageRendered: number) => {
    // 前向（endPageRendered+1 → numPages）
    setTimeout(async () => {
      let countInBatch = 0
      for (let pageNum = endPageRendered + 1; pageNum <= pdf.numPages; pageNum++) {
        if (cancelledRef.current) return
        await renderPage(pdf, pageNum)
        countInBatch++
        if (countInBatch >= BACKGROUND_BATCH_SIZE) {
          countInBatch = 0
          await delay(BACKGROUND_IDLE_MS)
        }
      }
    }, 400)

    // 后向（startPageRendered-1 → 1）
    setTimeout(async () => {
      let countInBatch = 0
      for (let pageNum = startPageRendered - 1; pageNum >= 1; pageNum--) {
        if (cancelledRef.current) return
        await renderPage(pdf, pageNum)
        countInBatch++
        if (countInBatch >= BACKGROUND_BATCH_SIZE) {
          countInBatch = 0
          await delay(BACKGROUND_IDLE_MS)
        }
      }
    }, 600)
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
      
      // setCurrentPage(pageNum) // 未使用的状态
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

