# Benchmarks

## 2026-03-13

### Environment

| Key                                      | Value                                  |
| ---------------------------------------- | -------------------------------------- |
| @agrodt/three-zstd-volume-loader version | 0.3.0                                  |
| ZSTD version                             | 1.5.7                                  |
| Iterations number                        | 30                                     |
| NRRD Gzip compression level              | 9                                      |
| ZSTD compression level                   | 22                                     |
| CPU                                      | 11th Gen Intel(R) Core(TM) i7-11800H   |
| RAM                                      | 32 GB                                  |
| OS                                       | Manjaro Linux (Linux 6.19.2-1-MANJARO) |
| Browser                                  | Firefox 148.0.2                        |

### Volume file size (MiB)

| Sample              | NRRD Gzip | Raw ZSTD |
| ------------------- | --------- | -------- |
| sample1_0750_solids | 69.83     | 56.71    |
| sample1_0750_pores  | 28.15     | 22.41    |
| sample2_0750_solids | 54.27     | 40.98    |
| sample2_0750_pores  | 2.94      | 2.34     |


### Load latency median (ms)

| Sample              | NRRDLoader | ZstdVolumeLoader |
| ------------------- | ---------- | ---------------- |
| sample1_0750_solids | 7 309 ± 43 | 4 511 ± 46       |
| sample1_0750_pores  | 1 897 ± 33 | 441 ± 10         |
| sample2_0750_solids | 5 856 ± 38 | 828 ± 5          |
| sample2_0750_pores  | 1 159 ± 8  | 108 ± 1          |

### Loaders comparing (% of NRRDLoader)

| Sample              | Volume size | Load latency |
| ------------------- | ----------- | ------------ |
| sample1_0750_solids | 81          | 62           |
| sample1_0750_pores  | 80          | 23           |
| sample2_0750_solids | 76          | 14           |
| sample2_0750_pores  | 80          | 9            |

## 2025-06-05

### Environment

| Key                                      | Value                                |
| ---------------------------------------- | ------------------------------------ |
| @agrodt/three-zstd-volume-loader version | 0.2.0                                |
| ZSTD version                             | 1.5.7                                |
| Iterations number                        | 10                                   |
| NRRD Gzip compression level              | 9                                    |
| ZSTD compression level                   | 22                                   |
| CPU                                      | 11th Gen Intel(R) Core(TM) i7-11800H |
| RAM                                      | 32 GB                                |
| OS                                       | Windows 11 Pro 24H2                  |
| Browser                                  | Firefox 139.0                        |

### Volume file size (MiB)

| Sample              | NRRD Gzip | Raw ZSTD |
| ------------------- | --------- | -------- |
| sample1_0750_solids | 69.83     | 56.71    |
| sample1_0750_pores  | 28.15     | 22.41    |
| sample2_0750_solids | 54.27     | 40.98    |
| sample2_0750_pores  | 2.94      | 2.34     |


### Load latency median (ms)

| Sample              | NRRDLoader | ZstdVolumeLoader |
| ------------------- | ---------- | ---------------- |
| sample1_0750_solids | 3 960 ± 58 | 2 296 ± 7        |
| sample1_0750_pores  | 1 687 ± 51 | 599 ± 22         |
| sample2_0750_solids | 3 370 ± 27 | 916 ± 15         |
| sample2_0750_pores  | 1 144 ± 24 | 194 ± 10         |

### Loaders comparing (% of NRRDLoader)

| Sample              | Volume size | Load latency |
| ------------------- | ----------- | ------------ |
| sample1_0750_solids | 81          | 58           |
| sample1_0750_pores  | 80          | 36           |
| sample2_0750_solids | 76          | 18           |
| sample2_0750_pores  | 80          | 17           |
