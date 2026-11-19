import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests',
  testMatch: '**/*.spec.ts',
  use: {
    baseURL: 'http://127.0.0.1:4173/C-Skeleton/',
    launchOptions: { executablePath: process.env.CHROMIUM_PATH },
  },
  webServer: {
    command: 'npm run build && npm run preview -- --host 127.0.0.1 --port 4173 --strictPort',
    env: { BASE_PATH: '/C-Skeleton/' },
    url: 'http://127.0.0.1:4173/C-Skeleton/',
    timeout: 60_000,
  },
})
