CC ?= clang
CFLAGS := --target=wasm32 -O3 -flto -nostdlib -DNDEBUG $(CFLAGS)

LD ?= wasm-ld
LDFLAGS := \
	--no-entry \
	--lto-O3 \
	--max-memory=4294967296 \
	--export-memory \
	--export=malloc \
	--export=free \
	--export=ZSTD_decompress \
	--export=ZSTD_decompressBound \
	$(LDFLAGS)

WASMOPT ?= wasm-opt
WASMOPTFLAGS := -all -Os

ZSTDDECLLIB_DIR := third-party/zstd/build/single_file_libs
ZSTDDECLLIB_FLAGS := \
	-DZSTD_LEGACY_SUPPORT=0 \
	-DHAVE_ZLIB=0 \
	-DHAVE_LZMA=0 \
	-DHAVE_LZ4=0 \
	-DZSTD_NOBENCH=0

.PHONY: all
all: src/zstddeclib.wasm

src/zstddeclib.wasm: build/walloc.o build/zstddeclib.o
	$(LD) $(LDFLAGS) -o build/$(@F) $?
	$(WASMOPT) $(WASMOPTFLAGS) build/$(@F) -o $@

build/walloc.o: third-party/walloc/walloc.c build/.gitignore
	$(CC) $(CFLAGS) -c $< -o $@

build/zstddeclib.o: $(ZSTDDECLLIB_DIR)/zstddeclib.c build/.gitignore
	$(CC) $(CFLAGS) $(ZSTDDECLLIB_FLAGS) -c $< -o $@

$(ZSTDDECLLIB_DIR)/zstddeclib.c:
	cd $(@D); sh create_single_file_decoder.sh

build/.gitignore:
	mkdir -p $(@D)
	echo '*' > $@

.PHONY: clean
clean:
	@rm -fv build/*.o build/*.wasm src/*.wasm

.PHONY: clean
distclean:
	@rm -rfv build src/*.wasm $(ZSTDDECLLIB_DIR)/zstddeclib.c
