import { useEffect, useState, useRef } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { motion } from 'framer-motion'
import LoadingSpinner from '@/components/LoadingSpinner'
import { getOssUrl } from '@/lib/oss-config'

export default function ReaderPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const issueParam = searchParams.get('issue')
  const targetPage = Number(searchParams.get('page')) || 1

  const [isLoading, setIsLoading] = useState(true)
  const canvasContainerRef = useRef<HTMLDivElement>(null)
  const cancelledRef = useRef(false)
  // ============ 图片模式 ============
  type Manifest = {
    numPages: number
    images: string[]
    pageHeights?: number[]
    width?: number
    issueTitle?: string
    outline?: Array<{ title: string; pageNumber: number; order?: number }>
    base?: string
  }

  const fetchManifest = async (): Promise<Manifest | null> => {
    if (!issueParam) return null
    const url = getOssUrl(`/data/pages/${issueParam}/manifest.json`)
    try {
      const res = await fetch(url, { cache: 'no-store' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = (await res.json()) as Manifest
      return data
    } catch (e) {
      console.warn('加载图片 manifest 失败', e)
      return null
    }
  }

  const createImagePage = (idx: number, src: string, altSrc: string | null, ratioPct: number) => {
    const wrap = document.createElement('div')
    wrap.className = 'page-container mb-4 md:mb-6'
    wrap.setAttribute('data-page', String(idx))
    const label = document.createElement('div')
    label.className = 'text-center text-xs text-gray-500 mb-1'
    label.textContent = `第 ${idx} 页`
    const shell = document.createElement('div')
    shell.className = 'page bg-white rounded shadow-md overflow-hidden'
    const sk = document.createElement('div')
    sk.className = 'bg-gray-100'
    sk.style.width = '100%'
    sk.style.paddingTop = `${ratioPct}%`
    const img = document.createElement('img')
    img.loading = idx <= 3 ? ('eager' as any) : ('lazy' as any)
    img.setAttribute('fetchpriority', idx <= 2 ? 'high' : 'auto')
    img.decoding = 'async'
    img.alt = `Page ${idx}`
    img.style.opacity = '0.001'
    img.addEventListener('load', () => {
      sk.remove()
      img.style.opacity = '1'
    })
    if (altSrc) {
      img.addEventListener('error', () => {
        if ((img as any).dataset.fallback !== '1') {
          ;(img as any).dataset.fallback = '1'
          img.src = altSrc
        }
      })
    }
    img.src = src
    shell.appendChild(sk)
    shell.appendChild(img)
    wrap.appendChild(label)
    wrap.appendChild(shell)
    return wrap
  }

  const loadImages = async () => {
    try {
      setIsLoading(true)
      const manifest = await fetchManifest()
      if (!manifest) {
        console.error('图片模式：未找到 manifest，保持图片模式不回退。')
        setIsLoading(false)
        return
      }
      // 展示容器，再进行插入，避免容器未挂载导致 appendChild 失败
      setIsLoading(false)
      await waitForContainerMounted()
      if (canvasContainerRef.current) {
        canvasContainerRef.current.innerHTML = ''
      }
      // 从 manifest 的路径中提取目录作为基路径；避免给 URL 构造器传无协议的相对路径
      const manifestPath = getOssUrl(`/data/pages/${issueParam}/manifest.json`)
      const usedBase = manifestPath.replace(/manifest\.json(?:\\?.*)?$/, '')
      const fallbackBase = usedBase.replace('/caixinweekly/', '/')
      const w = manifest.width || 0
      for (let i = 0; i < manifest.images.length; i++) {
        const idx = i + 1
        const name = manifest.images[i]
        const src = usedBase + name
        const alt = fallbackBase ? fallbackBase + name : null
        const h = (manifest.pageHeights && manifest.pageHeights[i]) ? manifest.pageHeights[i] : 0
        const ratioPct = (h > 0 && w > 0) ? (h / w * 100) : 140
        const node = createImagePage(idx, src, alt, ratioPct)
        canvasContainerRef.current?.appendChild(node)
      }
      // 立即跳到目标页，并在目标图像加载或布局稳定后再次校准，避免移动端偏移
      scrollToPage(targetPage, false)
      // 若目标页图片尚未完成加载，加载完成后再校正一次
      const targetWrap = canvasContainerRef.current?.querySelector(`[data-page="${targetPage}"]`)
      const targetImg = targetWrap?.querySelector('img') as HTMLImageElement | null
      if (targetImg) {
        if (!targetImg.complete) {
          targetImg.addEventListener(
            'load',
            () => {
              // 等一帧让回流完成
              requestAnimationFrame(() => scrollToPage(targetPage, false))
            },
            { once: true }
          )
        } else {
          // 已经加载，轻微延迟再对齐一次（处理地址栏收起/展开造成的视口变化）
          setTimeout(() => scrollToPage(targetPage, false), 150)
        }
      } else {
        // 退路：在短延迟后再对齐一次
        setTimeout(() => scrollToPage(targetPage, false), 200)
      }
    } catch (e) {
      console.error('图片模式加载失败：', e)
      setIsLoading(false)
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

  const scrollToPage = (pageNum: number, smooth: boolean = true): boolean => {
    console.log('尝试滚动到页面:', pageNum)
    const pageElement = document.querySelector(`[data-page="${pageNum}"]`)
    
    if (pageElement) {
      console.log('✅ 找到页面元素，开始滚动')
      const elementTop = pageElement.getBoundingClientRect().top + window.pageYOffset
      // 计算实际头部高度（含粘性导航），移动端自适应，避免硬编码
      const headerEl = document.querySelector('header')
      const headerH = headerEl ? (headerEl as HTMLElement).getBoundingClientRect().height : 0
      // 额外留出 8px 的呼吸间距
      const offsetPosition = elementTop - Math.max(headerH + 8, 0)
      
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

  useEffect(() => {
    cancelledRef.current = false
    loadImages()
    return () => {
      cancelledRef.current = true
    }
  }, [issueParam])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <LoadingSpinner text="正在加载页面..." size="lg" />
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

      {/* 内容容器：PDF或图片都会插入到这里 */}
      <div
        ref={canvasContainerRef}
        className="bg-gray-100 rounded-xl p-2 md:p-8 overflow-x-auto"
      />
    </div>
  )
}

