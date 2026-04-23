import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],

  build: {
    // No source maps in production — prevents reverse-engineering your code
    sourcemap: false,

    // Minify with oxc — Vite 6's built-in minifier (no separate install needed)
    minify: 'oxc',

    // Chunk splitting: vendor libs in a separate cached bundle
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('@supabase')) return 'supabase';
          if (id.includes('node_modules')) return 'vendor';
        },
      },
    },

    // Warn if any chunk exceeds 500 kB
    chunkSizeWarningLimit: 500,
  },
})
