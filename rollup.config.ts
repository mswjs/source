import * as path from 'path'
import resolve from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'
import json from '@rollup/plugin-json'
import typescript from 'rollup-plugin-typescript2'
import packageJson from './package.json'

const plugins = [
  json(),
  resolve({
    mainFields: ['module', 'main', 'jsnext:main', 'browser'],
    extensions: ['.js', '.jsx', '.ts', '.tsx'],
  }),
  typescript({
    // Emit declarations in the specified directory
    // instead of next to each individual built target.
    useTsconfigDeclarationDir: true,
  }),
  commonjs(),
]

const buildEsm = {
  input: [
    'src/index.ts',
    // List non-dependent modules so they could be tree-shaken
    // by the library's consumer.
    'src/add.ts',
    'src/multiply.ts',
  ],
  output: {
    format: 'esm',
    entryFileNames: '[name].js',
    chunkFileNames: '[name]-deps.js',
    dir: path.dirname(packageJson.module),
  },
  plugins,
}

const buildUmd = {
  input: 'src/index.ts',
  output: {
    format: 'umd',
    esModule: false,
    file: packageJson.main,
    name: packageJson.name.replace(/(?:^|-)(\w)/g, (_, letter) =>
      letter.toUpperCase()
    ),
  },
  plugins,
}

const buildCjs = {
  input: 'src/index.ts',
  output: {
    format: 'cjs',
    file: path.resolve(path.dirname(packageJson.types), 'cjs/index.js'),
  },
  plugins,
}

export default [buildEsm, buildUmd, buildCjs]
