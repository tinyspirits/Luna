import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Custom plugin to remove crossorigin attributes for Capacitor iOS
const removeCrossoriginPlugin = () => {
  return {
    name: 'remove-crossorigin',
    transformIndexHtml(html: string) {
      return html.replace(/ crossorigin/g, '');
    }
  }
}

// https://vite.dev/config/
export default defineConfig({
  base: process.env.CAPACITOR === 'true' ? './' : '/Luna/',
  build: {
    target: 'es2015',
  },
  plugins: [
    react(), 
    removeCrossoriginPlugin()
  ],
})
