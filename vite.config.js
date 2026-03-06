import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'www',
    emptyOutDir: false,
    assetsDir: 'assets',
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          // WebLLM stays in its own chunk — huge, dynamically imported anyway
          if (id.includes('@mlc-ai/web-llm')) return 'webllm'
          // Framer Motion — large animation lib
          if (id.includes('framer-motion')) return 'framer'
          // Inter font files — separate from app code
          if (id.includes('@fontsource/inter')) return 'fonts'
          // React core
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) return 'react'
          // React Router
          if (id.includes('react-router')) return 'router'
        }
      }
    }
  },
  optimizeDeps: {
    exclude: ['@mlc-ai/web-llm']
  }
})
