import path from 'path'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { inspectAttr } from 'plugin-inspect-react-code'

// https://vite.dev/config/
const isProduction = process.env.NODE_ENV === 'production';

export default defineConfig({
  base: isProduction ? '/linux-system/' : '/',
  plugins: [inspectAttr(), react()],
  server: {
    port: 3000,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
