import fs from 'fs/promises';
import {describe, it, mock, before, after} from 'node:test';
import {fileURLToPath} from 'url';
import assert from 'assert';

import {loadZSTDDecLib, type ZSTDDecLib, ZstdVolumeLoader, type Volume} from '../src/index.ts';

describe('loadZSTDDecLib', async () => {
  mockFetch();

  const [zstd, zstd2] = await Promise.all([
    loadZSTDDecLib(),
    loadZSTDDecLib(),
  ]);

  it('loaded only once', async () => {
    assert.ok(Object.is(zstd, zstd2));
    const zstd3 = await loadZSTDDecLib();
    assert.ok(Object.is(zstd, zstd3));
  });

  it('exports memory', () => assert.ok(zstd.memory instanceof WebAssembly.Memory));
  it('exports malloc', () => assert.ok(typeof zstd.malloc === 'function'));
  it('exports free', () => assert.ok(typeof zstd.free === 'function'));
  it('exports ZSTD_decompressBound', () => assert.ok(typeof zstd.ZSTD_decompressBound === 'function'));
  it('exports ZSTD_decompress', () => assert.ok(typeof zstd.ZSTD_decompress === 'function'));
});

describe('ZstdVolumeLoader', async () => {
  mockFetch();

  before(() => {
    global.ProgressEvent = ProgressEventMock as typeof ProgressEvent;
  });

  after(() => {
    // @ts-ignore(2790)
    delete global.ProgressEvent;
  });

  const zstd = await loadZSTDDecLib();

  it('load', async () => {
    const {type, xSize, ySize, zSize, data} = await loadVolume(zstd, './volume.raw.zst');

    assert.strictEqual(type, 'uint8');
    assert.strictEqual(xSize, 2);
    assert.strictEqual(ySize, 2);
    assert.strictEqual(zSize, 3);

    let i = 0;
    for (let di = 0; di < zSize * 100; di += 100) {
      for (let hi = 0; hi < ySize * 10; hi += 10) {
        for (let wi = 0; wi < xSize; ++wi, ++i) {
          assert.strictEqual(data[i], di + hi + wi);
        }
      }
    }
  });

  it('no metadata', () => assert.rejects(
    loadVolume(zstd, './volume-no-md.raw.zst'),
    new Error('Failed to parse metadata: no metadata frame'),
  ));

  it('bad metadata: dtype', () => assert.rejects(
    loadVolume(zstd, './volume-bad-dtype.raw.zst'),
    new Error('Failed to parse metadata: got `u8` data type, expected one of int8, int16, int32, int64, uint8, uint16, uint32, uint64, float32, float64'),
  ));

  it('bad metadata: size', () => assert.rejects(
    loadVolume(zstd, './volume-bad-size.raw.zst'),
    new Error('Failed to parse metadata: got `{xSize: 2, ySize: 2, zSize: undefined}` dimensions, expected numbers'),
  ));

  it('no ZSTD data', () => assert.rejects(
    loadVolume(zstd, './volume-no-data.raw.zst'),
    new Error('Invalid compressed data'),
  ));

  it('bad ZSTD data', () => assert.rejects(
    loadVolume(zstd, './volume-bad-data.raw.zst'),
    new Error('Decompression failed'),
  ));
});

function mockFetch() {
  mock.method(global, 'fetch', fetchLocal);
}

async function fetchLocal(input: URL | RequestInfo) {
  if (typeof input === 'object') {
    if (input instanceof Request) {
      input = input.url;
    } else {
      input = fileURLToPath(input);
    }
  }
  const body = await fs.readFile(input);
  return new Response(body, {headers: {'Content-Type': 'application/wasm'}});
}

class ProgressEventMock {
  type: string;
  loaded: number;
  total: number;

  constructor(type: string, options?: ProgressEventInit) {
    this.type = type;
    this.loaded = options?.loaded || 0;
    this.total = options?.total || 0;
  }
};

function loadVolume(zstd: ZSTDDecLib, filename: string): Promise<Volume> {
  const url = fileURLToPath(new URL(filename, import.meta.url));
  return new ZstdVolumeLoader(zstd).loadAsync(url);
}
