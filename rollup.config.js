import terser from '@rollup/plugin-terser';
import typescript from '@rollup/plugin-typescript';
import copy from 'rollup-plugin-copy2';

/** @type {import('rollup').RollupOptions} */
export default {
  input: 'src/index.ts',
  external: ['three'],
  output: {
    format: 'esm',
    file: 'dist/agrodt-three-zstd-volume-loader.min.mjs',
    sourcemap: true,
    globals: {three: 'THREE'},
  },
  plugins: [
    typescript(),
    terser(),
    copy({assets: [['src/zstddeclib.wasm', 'zstddeclib.wasm']]}),
  ]
}
