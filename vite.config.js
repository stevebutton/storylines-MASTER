import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import path from 'path'
import cesium from 'vite-plugin-cesium'

// https://vite.dev/config/
export default defineConfig({
  logLevel: 'error', // Suppress warnings, only show errors
  plugins: [
    react(),
    cesium(),   // handles Cesium worker files, asset copying, CESIUM_BASE_URL
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  optimizeDeps: {
    include: ['mapbox-gl'],
  },
});