import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['!**/*.test.ts', 'src/open-api/**/*.ts', 'src/traffic/**/*.ts'],
  format: 'esm',
  outDir: './lib',
  bundle: false,
  splitting: true,
  clean: true,
  sourcemap: true,
  tsconfig: './tsconfig.build.json',
})
