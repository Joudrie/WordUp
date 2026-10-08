import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  // GitHub Pages serves the project at /WordUp/; set PAGES_BASE in the workflow.
  base: process.env.PAGES_BASE || '/',
  plugins: [react(), tailwindcss()],
})
