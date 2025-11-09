import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    strictPort: true, // 如果 5173 已被占用，不自动用其他端口
  },
  optimizeDeps: {
    exclude: ['pdfjs-dist'],
  },
  build: {
    commonjsOptions: {
      transformMixedEsModules: true,
    },
  },
})

