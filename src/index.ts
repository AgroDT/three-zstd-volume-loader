import * as THREE from 'three';

const NP_JS_TYPE_MAP = Object.freeze({
  int8: Int8Array,
  int16: Int16Array,
  int32: Int32Array,
  int64: BigInt64Array,
  uint8: Uint8Array,
  uint16: Uint16Array,
  uint32: Uint32Array,
  uint64: BigUint64Array,
  float32: Float32Array,
  float64: Float64Array,
});

type NpJsTypeMap = typeof NP_JS_TYPE_MAP;
type NpArrayName = keyof NpJsTypeMap;
type NpJsArray<T extends NpArrayName> = NpJsTypeMap[T]['prototype'];

/**
 * Interface representing the ZSTD WebAssembly decompression library.
 */
export interface ZSTDDecLib {
  memory: WebAssembly.Memory;
  malloc(size: number): number;
  free(ptr: number): void;
  ZSTD_decompressBound(src: number, srcSize: number): number;
  ZSTD_decompress(dst: number, dstCapacity: number, src: number, srcSize: number): number;
}

/**
 * Interface representing a volumetric dataset.
 */
export interface Volume<T extends NpArrayName = NpArrayName> {
  xSize: number;
  ySize: number;
  zSize: number;
  /** Data type name as it is returned by `str(numpy.dtype)` in Python */
  type: T;
  /** Data array */
  data: NpJsArray<T>;
}

let zstdDecLibModule: WebAssembly.Module | null = null;
let zstdDecLibLoadingPromise: Promise<WebAssembly.Module> | null = null;

/**
 * Loads the bundled ZSTD WebAssembly decompression library.
 * @returns A promise resolving to the ZSTD decompression library.
 */
export async function loadZSTDDecLib(): Promise<WebAssembly.Module> {
  if (zstdDecLibModule) {
    return zstdDecLibModule;
  }

  if (!zstdDecLibLoadingPromise) {
    const url = new URL('./zstddeclib.wasm', import.meta.url);
    zstdDecLibLoadingPromise = WebAssembly.compileStreaming(fetch(url)).then(module => {
      zstdDecLibModule = module;
      zstdDecLibLoadingPromise = null;
      return zstdDecLibModule;
    });
  }

  return zstdDecLibLoadingPromise;
}

/**
 * Loader for ZSTD-compressed volumetric data.
 */
export class ZstdVolumeLoader extends THREE.Loader<Volume> {
  private zstd: WebAssembly.Module;
  private fileLoader: THREE.FileLoader;

  /**
   * Constructs a new ZSTD volume loader.
   * @param zstd The ZSTD decompression library instance.
   * @param manager Optional loading manager.
   */
  constructor(zstd: WebAssembly.Module, manager?: THREE.LoadingManager) {
    super(manager);
    this.zstd = zstd;
    this.fileLoader = new THREE.FileLoader(manager);
    this.fileLoader.responseType = 'arraybuffer';
  }

  /**
   * Loads a ZSTD-compressed volume from a given URL.
   * @param url The URL of the compressed volume file.
   * @param onLoad Callback function executed upon successful loading.
   * @param onProgress Callback function executed on progress events.
   * @param onError Callback function executed on error.
   */
  public override load = (
    url: string,
    onLoad?: (volume: Volume) => void,
    onProgress?: (event: ProgressEvent) => void,
    onError?: (err: unknown) => void,
  ): void => {
    const onLoad2 = (data: string | ArrayBuffer): void => {
      let promise: Promise<any> = this.processData(data as ArrayBuffer);
      if (onLoad) {
        promise = promise.then(onLoad);
      }
      if (onError) {
        promise = promise.catch(onError);
      }
    };
    this.fileLoader.load(url, onLoad2, onProgress, onError);
  }

  private processData = async (compressed: ArrayBuffer): Promise<Volume> => {
    const metadata = ZstdVolumeLoader.readMetadata(compressed);
    if (typeof metadata === 'string') {
      throw new Error('Failed to parse metadata: ' + metadata);
    }

    const data = await this.decompress(metadata.type, new Uint8Array(compressed));

    return {...metadata, data};
  }

  private static readMetadata(compressed: ArrayBuffer): Omit<Volume, 'data'> | string {
    const view = new DataView(compressed);

    const magic = view.getUint32(0, true);
    if ((magic & 0xFFFFFFF0) !== 0x184D2A50) {
      return 'no metadata frame';
    }

    const length = view.getUint32(4, true);
    const metadataBuffer = compressed.slice(8, 8 + length);
    const {type, xSize, ySize, zSize} = JSON.parse(new TextDecoder().decode(metadataBuffer));

    if (!(type in NP_JS_TYPE_MAP)) {
      return `got \`${type}\` data type, expected one of ${Object.keys(NP_JS_TYPE_MAP).join(', ')}`;
    }

    if (
      typeof xSize !== 'number'
      || typeof ySize !== 'number'
      || typeof zSize !== 'number'
    ) {
      return `got \`{xSize: ${xSize}, ySize: ${ySize}, zSize: ${zSize}}\` dimensions, expected numbers`;
    }

    return {type, xSize, ySize, zSize};
  }

  private decompress = async <T extends NpArrayName>(type: T, compressed: Uint8Array): Promise<NpJsArray<T>> => {
    const zstd = (await WebAssembly.instantiate(this.zstd)).exports as unknown as ZSTDDecLib;

    function allocate(length: number): number {
      const ptr = zstd.malloc(length);
      if (ptr) {
        return ptr;
      }
      throw new Error('Failed to allocate memory for ZSTD buffer');
    }

    let srcPtr = 0;
    let dstPtr = 0;

    try {
      const srcSize = compressed.length;
      const srcPtr = allocate(srcSize);
      const srcArr = new Uint8Array(zstd.memory.buffer, srcPtr, srcSize);
      srcArr.set(compressed);

      const dstCapacity = Number(zstd.ZSTD_decompressBound(srcPtr, srcSize));
      if (dstCapacity <= 0) {
        throw new Error('Invalid compressed data');
      }

      const dstPtr = allocate(dstCapacity);
      const resultSize = zstd.ZSTD_decompress(dstPtr, dstCapacity, srcPtr, srcSize);
      if (resultSize < 0) {
        throw new Error('Decompression failed');
      }

      return new NP_JS_TYPE_MAP[type](zstd.memory.buffer, dstPtr, resultSize);
    } finally {
      zstd.free(srcPtr);
      zstd.free(dstPtr);
    }
  }
}
