import { defineWorkspace } from 'vitest/config'

export default defineWorkspace([
  {
    test: {
      name: 'node',
      include: ['!**/*.browser.test.ts', 'test/**/*.test.ts'],
      globals: true,
      setupFiles: ['./vitest.setup.ts'],
      environment: 'node',
      environmentOptions: {
        happyDOM: {
          url: 'http://localhost',
        },
      },
    },
  },
  {
    test: {
      name: 'browser',
      include: ['test/**/*.browser.test.ts'],
      globals: true,
      setupFiles: ['./vitest.setup.ts'],
      browser: {
        name: 'chromium',
        enabled: true,
        provider: 'playwright',
      },
    },
  },
])
