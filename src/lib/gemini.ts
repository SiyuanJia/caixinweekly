import { GoogleGenerativeAI } from '@google/generative-ai'

export interface ArticleAnalysis {
  summary: string // 文章摘要
  insight: string // 核心洞察
}

/**
 * 使用Gemini生成文章摘要和洞察
 */
export async function generateArticleAnalysis(
  apiKey: string,
  articleTitle: string,
  articleContent: string
): Promise<ArticleAnalysis> {
  if (!apiKey) {
    throw new Error('请先在配置中设置Gemini API Key')
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' })

    const prompt = `请分析以下财新周刊文章，生成简洁的摘要和深刻的洞察：

文章标题：${articleTitle}

文章内容：
${articleContent.substring(0, 5000)} // 限制长度避免超出token限制

请按以下格式输出（用===分隔）：

摘要===
（用1-2句话概括文章核心内容，不超过80字）

洞察===
（提炼文章的深层含义、趋势判断或影响分析，2-3句话，不超过120字）`

    const result = await model.generateContent(prompt)
    const response = await result.response
    const text = response.text()

    // 解析返回的内容
    const parts = text.split('===').map(s => s.trim())
    
    let summary = '精彩内容，值得一读'
    let insight = '深度分析，洞察趋势'

    if (parts.length >= 2) {
      summary = parts[0].replace(/^摘要[:：]?\s*/i, '').trim()
      insight = parts[1].replace(/^洞察[:：]?\s*/i, '').trim()
    }

    return {
      summary,
      insight,
    }
  } catch (error) {
    console.error('Gemini API调用失败:', error)
    throw new Error('AI分析生成失败，请检查API Key或网络连接')
  }
}

/**
 * 批量生成文章分析（带进度回调）
 */
export async function batchGenerateAnalysis(
  apiKey: string,
  articles: Array<{ title: string; content: string }>,
  onProgress?: (current: number, total: number) => void
): Promise<ArticleAnalysis[]> {
  const results: ArticleAnalysis[] = []

  for (let i = 0; i < articles.length; i++) {
    try {
      const analysis = await generateArticleAnalysis(
        apiKey,
        articles[i].title,
        articles[i].content
      )
      results.push(analysis)
      
      if (onProgress) {
        onProgress(i + 1, articles.length)
      }

      // 避免API频率限制，每次请求间隔1秒
      if (i < articles.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    } catch (error) {
      console.error(`生成第${i + 1}篇文章分析失败:`, error)
      // 使用默认值
      results.push({
        summary: '精彩内容，值得一读',
        insight: '深度分析，洞察趋势',
      })
    }
  }

  return results
}

