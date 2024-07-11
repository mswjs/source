import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    environment: 'node',
    environmentOptions: {
      happyDOM: {
        url: 'http://localhost',
      },
    },
  },
})
