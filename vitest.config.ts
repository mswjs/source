import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'node',
          include: [
            '!**/*.browser.test.ts',
            'test/**/*.test.ts',
            'src/**/*.test.ts',
          ],
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
    ],
  },
})
