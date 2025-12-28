import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/cli.ts', 'src/index.ts'],
  format: ['cjs'],
  target: 'node18',
  sourcemap: true,
  clean: true,
  dts: true,
  splitting: false,
})
