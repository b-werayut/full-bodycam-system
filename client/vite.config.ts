import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      'hls.js': 'hls.js/dist/hls.light.mjs',
    },
  },
  define: {
    __API_BASE_URL__: JSON.stringify(
      process.env.NODE_ENV === 'production' 
        ? 'http://10.15.15.31:3007' 
        : '/api'
    )
  },
  server: {
    port: 3190,
    proxy: {
      '/api': {
        target: 'http://10.15.15.31:3007',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path,
      },
      '/ws': {
        target: 'ws://10.15.15.31:3009',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path,
      },
      '/api_internal': {
        target: 'http://10.15.15.31:3009',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path,
      },
      '/proxy': {
        target: 'http://10.15.15.31:3007',
        changeOrigin: true,
        secure: false,
      }
    }
  }
})
