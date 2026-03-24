import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

import tailwindcss from '@tailwindcss/vite'


// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: [['babel-plugin-react-compiler']],
      },
    }),
  tailwindcss()],
  server: {
    proxy: {
      // Любой запрос, который начинается с /api, Vite перехватит
      // и отправит на твой APIGateway
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        secure: false, // Отключаем проверку SSL (https), так как мы на localhost
      }
    }
  }
})
