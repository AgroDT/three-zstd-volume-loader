import {readFile} from 'node:fs/promises';
import {dts} from 'rolldown-plugin-dts';

/** @type {import('rolldown').RolldownPlugin} */
const copyZstddeclibWasm = {
  name: 'copy-zstddeclib-wasm',
  async generateBundle() {
    this.emitFile({
      type: 'asset',
      fileName: 'zstddeclib.wasm',
      source: await readFile('src/zstddeclib.wasm'),
    });
  },
};

/** @type {import('rolldown').RolldownOptions} */
export default {
  input: {
    'agrodt-three-zstd-volume-loader.min': 'src/index.ts',
  },
  external: ['three'],
  output: {
    format: 'esm',
    dir: 'dist',
    sourcemap: true,
    globals: {three: 'THREE'},
    minify: true,
  },
  plugins: [
    dts(),
    copyZstddeclibWasm,
  ]
}
