import {Bench} from 'tinybench';
import {NRRDLoader} from 'three/examples/jsm/loaders/NRRDLoader.js';
import {loadZSTDDecLib, ZstdVolumeLoader} from '@agrodt/three-zstd-volume-loader';

import './main.css';

const iterations = 10;
const samples = [
  'sample1_0750_solids',
  'sample1_0750_pores',
  'sample2_0750_solids',
  'sample2_0750_pores',
];

const downloadButtonElem = document.getElementById('download-results-button') as HTMLButtonElement;
const statusElem = document.getElementById('status') as HTMLParagraphElement;
const tbodyElem = document.getElementById('tbody') as HTMLTableSectionElement;
let rawBenchmarkResults = '';

downloadButtonElem.addEventListener('click', () => {
  if (rawBenchmarkResults.length === 0) {
    return;
  }

  const blob = new Blob([rawBenchmarkResults], {type: 'text/csv;charset=utf-8'});
  const downloadUrl = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = downloadUrl;
  a.download = `benchmark-results-${Date.now()}.csv`;
  a.click();
  a.remove();

  URL.revokeObjectURL(downloadUrl);
});

const bench = new Bench({
  iterations,
  warmupIterations: 3,
});

bench.addEventListener('warmup', () => {
  statusElem.textContent = '♨️ Warming up...';
});

bench.addEventListener('start', () => {
  rawBenchmarkResults = 'task,iteration,latency (ms)\n';
  downloadButtonElem.hidden = true;
  document.getElementById('results-table')!.hidden = false;
  statusElem.textContent = '🚀 Running benchmarks...';
});

bench.addEventListener('complete', () => {
  statusElem.textContent = `📊 Results for ${iterations} iteration(s)`;
  downloadButtonElem.hidden = rawBenchmarkResults.length === 0;
});

bench.addEventListener('cycle', (evt) => {
  const task = evt.task;
  if (!task?.result) {
    return;
  }

  const taskName = task.name;
  const {p50, mad, samples} = task.result.latency ?? {};
  let latencyMedian = 'NA';
  if (p50 !== undefined) {
    latencyMedian = p50.toLocaleString(undefined, {maximumFractionDigits: 3});
    if (mad) {
      latencyMedian = `${latencyMedian} &plusmn; ${mad.toLocaleString(undefined, {maximumFractionDigits: 3})}`;
    }
  }
  const row = document.createElement('tr');
  row.innerHTML = `<td>${taskName}</td><td>${latencyMedian}</td>`;
  tbodyElem.appendChild(row);

  samples.forEach((latency, index) => {
    rawBenchmarkResults += `${taskName},${index + 1},${latency}\n`;
  });
});

const zstd = await loadZSTDDecLib()
const zstdLoader = new ZstdVolumeLoader(zstd);
const nrrdLoader = new NRRDLoader();

for (const sample of samples) {
  bench.add(`${sample} - ZstdVolumeLoader`, () => zstdLoader.loadAsync(`/volumes/${sample}.raw.zst`));
  bench.add(`${sample} - NRRDLoader`, () => nrrdLoader.loadAsync(`/volumes/${sample}.gzip.nrrd`));
}

await bench.run();
