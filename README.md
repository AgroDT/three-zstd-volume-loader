# three-zstd-volume-loader

A Three.js plugin for loading volumetric data (e.g., CT scan results)
compressed using ZSTD. This package is particularly useful for rendering soil
CT scan data with Three.js.

## Features

- Efficient loading of ZSTD-compressed volumetric data
- Written in TypeScript
- Zero dependencies
- Total gzipped size: 24.36&nbsp;KB (JS: 1.05&nbsp;KB, WASM: 23.31&nbsp;KB)

## Installation

You can import this plugin directly through services like
[jsDelivr](https://www.jsdelivr.com/) or similar:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>ZSTD Volume Example</title>
  </head>
  <body>
    <script type="importmap">
    {
      "imports": {
        "three": "https://cdn.jsdelivr.net/npm/three/build/three.module.min.js",
        "@agrodt/three-zstd-volume-loader": "https://esm.run/@agrodt/three-zstd-volume-loader"
      }
    }
    </script>
    <script type="module">
        import * as THREE from 'three';
        import {loadZSTDDecLib, ZstdVolumeLoader} from '@agrodt/three-zstd-volume-loader';
        // rest of your code
    </script>
  </body>
</html>
```

To use with bundlers, install the plugin using your preferred package manager:

```sh
npm add @agrodt/three-zstd-volume-loader
# or
pnpm add @agrodt/three-zstd-volume-loader
# or
yarn add @agrodt/three-zstd-volume-loader
```

## Usage

To use the loader, you need to load the ZSTD decompression library. This
package provides a WASM module with a minimal required set of exported
functions:

```typescript
import * as THREE from 'three';
import {loadZSTDDecLib, ZstdVolumeLoader} from '@agrodt/three-zstd-volume-loader';

async function renderVolume(url: string) {
  const zstd = await loadZSTDDecLib();
  const {data, xSize, ySize, zSize} = await new ZstdVolumeLoader(zstd).loadAsync(url);
  const texture = new THREE.Data3DTexture(data, xSize, ySize, zSize);
  texture.needsUpdate = true;
  // rest of your code
}
```

The `loadZSTDDecLib` function caches the loaded WASM instance, so it can be
called multiple times.

This package is designed to be used with
[@agrodt/three-soil-volume-shader](https://github.com/AgroDT/three-soil-volume-shader)
for visualization. A full example can be found in
[@agrodt/three-soil-volume-example](https://github.com/AgroDT/three-soil-volume-example).

## Volume File Format

The volume file used by this plugin is a ZSTD-compressed Fortran-contiguous
array of 3D values (X×Y×Z). A simple JSON header is used to transmit metadata
such as data type and size. The header is embedded in a compressed volume file
at the very beginning within a
[ZSTD Skippable Frame](https://github.com/facebook/zstd/blob/dev/doc/zstd_compression_format.md#skippable-frames),
with the magic number `0x184D2A50`.

### Header Schema
```typescript
interface Header {
  xSize: number;
  ySize: number;
  zSize: number;
  type:
    | 'int8'
    | 'int16'
    | 'int32'
    | 'int64'
    | 'uint8'
    | 'uint16'
    | 'uint32'
    | 'uint64'
    | 'float32'
    | 'float64';
}
```

### Example Header

```json
{
  "xSize": 300,
  "ySize": 300,
  "zSize": 500,
  "type": "uint8"
}
```

## Volume File Creation

Here is an example Python script for generating a volume file from
reconstructed volume slices (BMP images):

```python
# /// script
# requires-python = ">=3.12"
# dependencies = [
#     "numpy~=2.2",
#     "pillow~=11.1",
#     "zstandard~=0.23",
# ]
# ///

import argparse
import json
import struct
from pathlib import Path

import numpy as np
from PIL import Image
import zstandard

METADATA_FRAME_MAGIC = 0x184D2A50

def parse_args():
    parser = argparse.ArgumentParser()
    parser.add_argument('bmp_dir', type=Path)
    parser.add_argument('output', type=Path)
    return parser.parse_args()

def read_bmp(path: Path):
    print('reading', path)
    with Image.open(path) as img:
        return np.array(img.convert('L'))

args = parse_args()

grayscale = [read_bmp(p) for p in sorted(args.bmp_dir.glob('*.bmp'))]
data = np.stack(grayscale, axis=-1)

x_size, y_size, z_size = data.shape
metadata_bytes = json.dumps(
    {'xSize': x_size, 'ySize': y_size, 'zSize': z_size, 'type': str(data.dtype)},
    separators=(',',':'),
).encode()

print(f'compressing a volume of size {width}x{height}x{depth}')
compressed = zstandard.compress(data.tobytes('F'))

## For better compression use something like
# params = zstandard.ZstdCompressionParameters(compression_level=22, threads=1, enable_ldm=True)
# cctx = zstandard.ZstdCompressor(compression_params=params)
# compressed = cctx.compress(data.tobytes('F'))

print('writing', args.output)
args.output.parent.mkdir(parents=True, exist_ok=True)
with args.output.open('wb') as fp:
    fp.write(struct.pack('<I I', METADATA_FRAME_MAGIC, len(metadata_bytes)))
    fp.write(metadata_bytes)
    fp.write(compressed)
```

You can run it using:

```sh
uv run create-volume.py path/to/bmp_dir output/volume.raw.zst
```

## Development

### Building ZSTD

To rebuild [`src/zstddeclib.wasm`](src/zstddeclib.wasm) when a new version is
released, follow these steps:

```sh
# Clone this repository with submodules
git clone --recursive https://github.com/AgroDT/three-zstd-volume-loader.git
# or just initialize it if required
git submodule update --init --recursive
# Fetch latest changes and checkout to the required release
git -C third-party/zstd fetch
git -C third-party/zstd checkout ${ZSTD_VERSION}
# Remove the current WASM module
make distclean
```

The following prerequisites are required to compile ZSTD to WASM:

- WASM-enabled C compiler ([clang](https://clang.llvm.org/))
- wasm-opt from [binaryen](https://github.com/WebAssembly/binaryen)
- [wasi-libc](https://github.com/WebAssembly/wasi-libc) sysroot

Here are commands to compile with [MSYS2](https://www.msys2.org/) on Windows:

```sh
# Install the prerequisites
pacman -S \
  mingw-w64-clang-x86_64-clang \
  mingw-w64-clang-x86_64-binaryen \
  mingw-w64-clang-x86_64-wasi-libc
# Build
CC=clang LD=wasm-ld CFLAGS=-I/clang64/share/wasi-sysroot/include/wasm32-wasip2 make
```

## License

This project is licensed under the MIT License.

## Contributing

Contributions are welcome!
