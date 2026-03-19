import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  base: './', // Use relative paths for extension and gh-pages
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      input: {
        main: ('index.html'),
        popup: ('popup.html')
      }
    }
  }
})
