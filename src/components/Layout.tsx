import { ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Settings, BookOpen } from 'lucide-react'
import { useAppStore } from '@/lib/store'
import { motion } from 'framer-motion'

interface LayoutProps {
  children: ReactNode
}

export default function Layout({ children }: LayoutProps) {
  const location = useLocation()
  const { setIsConfigOpen } = useAppStore()

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 顶部导航栏 */}
      <header className="bg-caixin-navy text-white shadow-lg sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <Link to="/" className="flex items-center space-x-3 group">
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="flex items-center space-x-3"
              >
                <BookOpen className="w-8 h-8 text-caixin-gold" />
                <div>
                  <h1 className="text-2xl font-bold tracking-tight">
                    财新<span className="text-caixin-gold">Weekly</span>
                  </h1>
                  <p className="text-xs text-gray-300">高端新闻杂志阅读平台</p>
                </div>
              </motion.div>
            </Link>

            {/* 右侧按钮 */}
            <div className="flex items-center space-x-4">
              {location.pathname === '/' && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setIsConfigOpen(true)}
                  className="p-2 bg-caixin-gold text-caixin-navy rounded-lg hover:bg-caixin-gold-light transition-colors"
                >
                  <Settings className="w-4 h-4" />
                </motion.button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* 主内容区 */}
      <main className="container mx-auto px-4 py-8">
        {children}
      </main>

      {/* 页脚 */}
      <footer className="bg-white border-t border-gray-200 mt-16">
        <div className="container mx-auto px-4 py-6 text-center text-sm text-gray-500">
          <p>财新Weekly © {new Date().getFullYear()} · 高端新闻阅读体验</p>
        </div>
      </footer>
    </div>
  )
}

