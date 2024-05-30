import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/open-api/**/*.ts', 'src/traffic/**/*.ts', '!**/*.test.ts'],
  format: 'esm',
  outDir: './lib',
  bundle: false,
  splitting: true,
  clean: true,
  sourcemap: true,
  tsconfig: './tsconfig.build.json',
})
