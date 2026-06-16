import {readFile} from 'node:fs/promises';
import {dts} from 'rolldown-plugin-dts';
import type { RolldownOptions, RolldownPlugin } from 'rolldown';

const copyZstddeclibWasm: RolldownPlugin = {
  name: 'copy-zstddeclib-wasm',
  async generateBundle() {
    this.emitFile({
      type: 'asset',
      fileName: 'zstddeclib.wasm',
      source: await readFile('src/zstddeclib.wasm'),
    });
  },
};

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
    dts({tsconfig: "tsconfig.lib.json"}),
    copyZstddeclibWasm,
  ]
} satisfies RolldownOptions;
