import React, { useState, useEffect } from 'react';
import { Upload, FileText, FileJson, Download, CheckCircle, Wifi, WifiOff } from 'lucide-react';
import { getOutlineFromIndexedDB } from '../lib/pdf-parser';
import { testOssConnection, OSS_CONFIG } from '../lib/oss-config';

export default function ConfigPage() {
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [mdFiles, setMdFiles] = useState<File[]>([]);
  const [outlineExported, setOutlineExported] = useState(false);
  const [ossConnected, setOssConnected] = useState<boolean | null>(null);
  const [testing, setTesting] = useState(false);

  // 页面加载时自动测试 OSS 连通性
  useEffect(() => {
    handleTestOss();
  }, []);

  const handlePdfUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setPdfFile(e.target.files[0]);
    }
  };

  const handleMdUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setMdFiles(Array.from(e.target.files));
    }
  };

  const handleTestOss = async () => {
    setTesting(true);
    const result = await testOssConnection();
    setOssConnected(result);
    setTesting(false);
  };

  const handleExportOutline = async () => {
    try {
      // 假设当前期刊 ID 为最新上传的 PDF 文件名
      const issueId = pdfFile?.name.replace('.pdf', '') || 'latest';
      const outline = await getOutlineFromIndexedDB(issueId);
      
      if (!outline) {
        alert('未找到 outline 数据，请先上传并解析 PDF');
        return;
      }

      // 下载为 JSON 文件
      const blob = new Blob([JSON.stringify(outline, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${issueId}-outline.json`;
      a.click();
      URL.revokeObjectURL(url);
      
      setOutlineExported(true);
      setTimeout(() => setOutlineExported(false), 3000);
    } catch (error) {
      console.error('导出 outline 失败:', error);
      alert('导出失败，请检查控制台');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">配置中心</h1>

        {/* OSS 连通性测试 */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              {ossConnected === null ? (
                <Wifi className="w-5 h-5 text-gray-400 mr-2 animate-pulse" />
              ) : ossConnected ? (
                <Wifi className="w-5 h-5 text-green-600 mr-2" />
              ) : (
                <WifiOff className="w-5 h-5 text-red-600 mr-2" />
              )}
              <div>
                <h2 className="text-lg font-semibold">OSS 对象存储连通性</h2>
                <p className="text-sm text-gray-500">
                  {OSS_CONFIG.enabled ? `已启用 (${OSS_CONFIG.baseUrl})` : '未启用（开发模式）'}
                </p>
              </div>
            </div>
            <button
              onClick={handleTestOss}
              disabled={testing}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                testing
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : ossConnected
                  ? 'bg-green-100 text-green-700 hover:bg-green-200'
                  : 'bg-red-100 text-red-700 hover:bg-red-200'
              }`}
            >
              {testing ? '测试中...' : ossConnected === null ? '测试连接' : ossConnected ? '✓ 已连接' : '✗ 连接失败'}
            </button>
          </div>
        </div>

        {/* PDF 上传 */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center mb-4">
            <FileText className="w-5 h-5 text-blue-600 mr-2" />
            <h2 className="text-xl font-semibold">1. 上传 PDF 文件</h2>
          </div>
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors">
            <input
              type="file"
              accept=".pdf"
              onChange={handlePdfUpload}
              className="hidden"
              id="pdf-upload"
            />
            <label htmlFor="pdf-upload" className="cursor-pointer">
              <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">
                {pdfFile ? `已选择: ${pdfFile.name}` : '点击或拖拽上传 PDF 文件'}
              </p>
            </label>
          </div>
        </div>

        {/* 导出 Outline */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center mb-4">
            <FileJson className="w-5 h-5 text-green-600 mr-2" />
            <h2 className="text-xl font-semibold">2. 导出 Outline JSON</h2>
          </div>
          <p className="text-gray-600 mb-4">
            从浏览器缓存中导出 PDF 的目录结构（outline），供 Python 脚本使用
          </p>
          <button
            onClick={handleExportOutline}
            disabled={!pdfFile}
            className={`flex items-center px-6 py-3 rounded-lg font-medium transition-colors ${
              pdfFile
                ? 'bg-green-600 text-white hover:bg-green-700'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            <Download className="w-5 h-5 mr-2" />
            导出 Outline
            {outlineExported && <CheckCircle className="w-5 h-5 ml-2 text-green-200" />}
          </button>
        </div>

        {/* MD 文件上传 */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center mb-4">
            <FileText className="w-5 h-5 text-purple-600 mr-2" />
            <h2 className="text-xl font-semibold">3. 上传 Markdown 文件</h2>
          </div>
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-purple-400 transition-colors">
            <input
              type="file"
              accept=".md"
              multiple
              onChange={handleMdUpload}
              className="hidden"
              id="md-upload"
            />
            <label htmlFor="md-upload" className="cursor-pointer">
              <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">
                {mdFiles.length > 0
                  ? `已选择 ${mdFiles.length} 个文件`
                  : '点击或拖拽上传 Markdown 文件（可多选）'}
              </p>
            </label>
          </div>
          {mdFiles.length > 0 && (
            <div className="mt-4">
              <h3 className="text-sm font-medium text-gray-700 mb-2">已选择的文件：</h3>
              <ul className="space-y-1">
                {mdFiles.map((file, index) => (
                  <li key={index} className="text-sm text-gray-600 flex items-center">
                    <FileText className="w-4 h-4 mr-2 text-purple-500" />
                    {file.name}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* 使用说明 */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-3">📝 使用说明</h3>
          <ol className="list-decimal list-inside space-y-2 text-sm text-blue-800">
            <li>上传 PDF 文件，浏览器会自动解析并存储到 IndexedDB</li>
            <li>点击"导出 Outline"按钮，将目录结构下载为 JSON 文件</li>
            <li>上传 Markdown 文件（PaddleOCR 生成的识别结果）</li>
            <li>
              在本地运行 Python 脚本：
              <code className="block bg-blue-100 p-2 mt-2 rounded text-xs overflow-x-auto">
                python tools/build_issue_from_md.py \<br />
                &nbsp;&nbsp;--md-files ./part1.md ./part2.md \<br />
                &nbsp;&nbsp;--outline ./outline.json \<br />
                &nbsp;&nbsp;--issue-id 2025-40 \<br />
                &nbsp;&nbsp;...
              </code>
            </li>
            <li>将生成的 JSON、MD、PDF 文件上传到 OSS</li>
          </ol>
        </div>
      </div>
    </div>
  );
}

