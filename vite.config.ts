import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    outDir: 'dist',
    sourcemap: true
  },
  server: {
    port: 3000,
    open: true
  },
  optimizeDeps: {
    exclude: ['@vercel/blob', '@netlify/blobs']
  },
  resolve: {
    alias: {
      '@vercel/blob': 'virtual:vercel-blob',
      '@netlify/blobs': 'virtual:netlify-blobs'
    }
  },
  plugins: [
    {
      name: 'virtual-modules',
      resolveId(id) {
        if (id === 'virtual:vercel-blob' || id === 'virtual:netlify-blobs') {
          return id
        }
      },
      load(id) {
        if (id === 'virtual:vercel-blob' || id === 'virtual:netlify-blobs') {
          return 'export default {}; export const get = () => null; export const put = () => null; export const set = () => null;'
        }
      }
    }
  ]
})
