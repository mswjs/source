import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  outDir: './lib',
  clean: true,
  tsconfig: './tsconfig.build.json',
  // dts: true,
})
