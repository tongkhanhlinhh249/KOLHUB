import { defineConfig } from 'vitest/config'
import path from 'path'

// Separate from vite.config.ts: the Tailwind/React plugins keep watchers alive
// and stop `vitest run` from exiting. Service tests are plain TypeScript.
export default defineConfig({
  resolve: { alias: { '@': path.resolve(__dirname, './src') } },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
