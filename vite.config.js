import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api/iam': {
        target: 'https://iam.earmshub.com',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/api\/iam/, ''),
      },
    },
  },
})
