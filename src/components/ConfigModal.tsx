import { useState } from 'react'
import { X, Upload, CheckCircle, AlertCircle, Download } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAppStore } from '@/lib/store'
import { db, updateSettings } from '@/lib/db'
import { parsePDF, getUnsplashPlaceholder } from '@/lib/pdf-parser'

export default function ConfigModal() {
  const { isConfigOpen, setIsConfigOpen } = useAppStore()
  const [isUploading, setIsUploading] = useState(false)
  const [uploadStatus, setUploadStatus] = useState<{
    type: 'success' | 'error' | 'info' | null
    message: string
  }>({ type: null, message: '' })
  const [isExporting, setIsExporting] = useState(false)
  const [lastUploadedPdfBlob, setLastUploadedPdfBlob] = useState<Blob | null>(null)
  const [lastUploadedTitle, setLastUploadedTitle] = useState<string>('')


  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || file.type !== 'application/pdf') {
      setUploadStatus({
        type: 'error',
        message: '请选择PDF文件'
      })
      return
    }

    setIsUploading(true)
    setUploadStatus({
      type: 'info',
      message: '正在解析PDF...'
    })

    try {
      // 1. 解析PDF
      const pdfBlob = file
      setLastUploadedPdfBlob(pdfBlob)
      setLastUploadedTitle(file.name.replace('.pdf', ''))
      const parsedData = await parsePDF(pdfBlob)

      if (parsedData.outline.length === 0) {
        throw new Error('PDF中未找到目录书签，请确保PDF包含完整的目录结构')
      }

      // 2. 保存期次信息
      const issueTitle = file.name.replace('.pdf', '')
      const issueId = await db.issues.add({
        title: issueTitle,
        uploadDate: new Date(),
        pdfBlob,
      })

      setUploadStatus({
        type: 'info',
        message: `✅ 解析到 ${parsedData.outline.length} 篇文章，正在保存...`
      })

      // 3. 提取文章信息 - 使用模拟数据
      const mockSummaries = [
        '本文深入探讨了当前经济形势下的市场变化，揭示了背后的深层次原因。',
        '通过详实的数据分析，文章展现了行业发展的新趋势和未来方向。',
        '作者以独特视角审视政策变化，为读者提供了全新的思考维度。',
        '文章聚焦科技创新领域，解读了最新技术突破的商业价值。',
        '通过深度调查报道，揭示了事件背后不为人知的真相。',
        '本文从全球视野出发，分析了国际局势变化对国内的影响。',
        '作者结合理论与实践，为复杂问题提供了可行的解决方案。',
        '文章梳理了历史脉络，帮助读者理解当下事件的来龙去脉。',
      ]

      const mockInsights = [
        '这一变化标志着行业进入新的发展阶段，将深刻影响未来格局。值得持续关注相关政策走向和市场反应。',
        '数据背后反映的是结构性调整的必然趋势。企业和投资者需要及时调整策略，把握新机遇。',
        '政策的微妙变化往往预示着重大转折。理解政策意图，是把握市场节奏的关键。',
        '技术创新不仅改变产品形态，更将重构整个产业链。先行者将获得巨大的竞争优势。',
        '真相的披露有助于市场恢复理性。透明度是建立信任的基础，也是长期发展的保障。',
        '全球化背景下，没有孤立的事件。国际视野是理解国内变化的必要前提。',
        '理论指导实践，实践检验理论。将两者有机结合，才能找到真正有效的路径。',
        '历史是最好的教科书。从历史中汲取智慧，能够更清晰地看清未来方向。',
      ]

      const articles = parsedData.outline.map((item, index) => {
        return {
          issueId: issueId as number,
          title: item.title,
          pageNumber: item.pageNumber,
          coverImageUrl: getUnsplashPlaceholder(item.title),
          order: index,
          aiSummary: mockSummaries[index % mockSummaries.length],
          aiInsight: mockInsights[index % mockInsights.length],
        }
      })

      setUploadStatus({
        type: 'info',
        message: `正在保存${articles.length}篇文章...`
      })

      // 4. 保存所有文章（使用模拟的AI分析数据）
      for (const article of articles) {
        await db.articles.add(article)
      }

      // 5. 设置为当前选中期次
      await updateSettings({ lastSelectedIssueId: issueId as number })

      setUploadStatus({
        type: 'success',
        message: `✨ 《${issueTitle}》上传成功！共${articles.length}篇文章，可点击"导出outline.json"保存目录`
      })

      // 不自动关闭弹窗，让用户导出 outline
      // setTimeout(() => {
      //   setIsConfigOpen(false)
      //   window.location.reload()
      // }, 2000)

    } catch (error) {
      console.error('上传失败:', error)
      setUploadStatus({
        type: 'error',
        message: error instanceof Error ? error.message : '上传失败，请重试'
      })
    } finally {
      setIsUploading(false)
    }
  }

  const handleExportOutline = async () => {
    try {
      setIsExporting(true)
      // 优先使用"刚上传"的 PDF Blob
      if (lastUploadedPdfBlob) {
        const parsed = await parsePDF(lastUploadedPdfBlob)
        const outlineObj = {
          issueTitle: lastUploadedTitle,
          outline: parsed.outline.map(it => ({
            title: it.title,
            pageNumber: it.pageNumber,
          })),
        }
        // 生成文件名
        const match = lastUploadedTitle.match(/(20\d{2}).*?第(\d+)期/)
        let issueIdStr = 'outline'
        if (match) {
          const y = match[1]
          const n = match[2].padStart(2, '0')
          issueIdStr = `${y}-${n}-outline`
        }
        const blob = new Blob([JSON.stringify(outlineObj, null, 2)], { type: 'application/json;charset=utf-8' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${issueIdStr}.json`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
        setUploadStatus({ type: 'success', message: '✅ Outline 导出成功！' })
        setTimeout(() => setUploadStatus({ type: null, message: '' }), 3000)
      } else {
        setUploadStatus({ type: 'info', message: '请先上传 PDF 文件' })
        setTimeout(() => setUploadStatus({ type: null, message: '' }), 3000)
      }
    } catch (error) {
      console.error('导出失败:', error)
      setUploadStatus({ type: 'error', message: '导出失败，请重试' })
    } finally {
      setIsExporting(false)
    }
  }

  if (!isConfigOpen) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        >
          {/* 标题栏 */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h2 className="text-2xl font-bold text-caixin-navy">配置中心</h2>
            <button
              onClick={() => setIsConfigOpen(false)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 space-y-6">

            {/* Gemini API Key设置（已注释，测试阶段不需要） */}
            {/* <div className="space-y-3">
              <label className="flex items-center space-x-2 text-sm font-medium text-gray-700">
                <Key className="w-4 h-4 text-caixin-gold" />
                <span>Gemini API Key</span>
              </label>
              <div className="flex space-x-2">
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="输入您的Gemini API Key"
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-caixin-gold focus:border-transparent"
                />
                <button
                  onClick={handleSaveApiKey}
                  className="px-6 py-2 bg-caixin-navy text-white rounded-lg hover:bg-caixin-navy-light transition-colors"
                >
                  保存
                </button>
              </div>
              <p className="text-xs text-gray-500">
                用于生成文章AI摘要和洞察
              </p>
            </div> */}

            {/* PDF上传 */}
            <div className="space-y-3">
              <label className="flex items-center space-x-2 text-sm font-medium text-gray-700">
                <Upload className="w-4 h-4 text-caixin-gold" />
                <span>上传新一期周刊</span>
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-caixin-gold transition-colors">
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={handleFileUpload}
                  disabled={isUploading}
                  className="hidden"
                  id="pdf-upload"
                />
                <label
                  htmlFor="pdf-upload"
                  className={`cursor-pointer ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <Upload className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                  <p className="text-sm text-gray-600 mb-1">
                    {isUploading ? '正在上传...' : '点击选择或拖拽PDF文件'}
                  </p>
                  <p className="text-xs text-gray-400">
                    支持财新周刊PDF格式，需包含完整目录书签
                  </p>
                </label>
              </div>
            </div>

            {/* 导出 outline */}
            <div className="space-y-3">
              <label className="flex items-center space-x-2 text-sm font-medium text-gray-700">
                <Download className="w-4 h-4 text-caixin-gold" />
                <span>导出 outline.json</span>
              </label>
              <button
                onClick={handleExportOutline}
                disabled={isUploading || isExporting}
                className="px-4 py-2 bg-caixin-navy text-white rounded-lg hover:bg-caixin-navy-light transition-colors disabled:opacity-50"
              >
                {isExporting ? '正在导出...' : '导出'}
              </button>
              <p className="text-xs text-gray-500">用于离线构建脚本；导出后可重命名为 2025-XX-outline.json</p>
            </div>

            {/* 状态提示 */}
            {uploadStatus.type && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex items-center space-x-2 p-4 rounded-lg ${
                  uploadStatus.type === 'success' ? 'bg-green-50 text-green-800' :
                  uploadStatus.type === 'error' ? 'bg-red-50 text-red-800' :
                  'bg-blue-50 text-blue-800'
                }`}
              >
                {uploadStatus.type === 'success' ? (
                  <CheckCircle className="w-5 h-5" />
                ) : uploadStatus.type === 'error' ? (
                  <AlertCircle className="w-5 h-5" />
                ) : (
                  <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                )}
                <span className="text-sm font-medium">{uploadStatus.message}</span>
              </motion.div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}

