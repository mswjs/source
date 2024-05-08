import { defineConfig, Options } from 'tsup'

const commonOptions = {
  clean: true,
  sourcemap: true,
  tsconfig: './tsconfig.build.json',
  // dts: true,
} satisfies Options

const esm = defineConfig({
  entry: ['src/**/*.ts'],
  format: 'esm',
  outDir: './lib/esm',
  bundle: false,
  splitting: true,
  ...commonOptions,
})

const cjs = defineConfig({
  entry: ['src/index.ts'],
  format: 'cjs',
  outDir: './lib/cjs',
  bundle: true,
  splitting: false,
  ...commonOptions,
})

export default [esm, cjs]
