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

const statusElem = document.getElementById('status') as HTMLParagraphElement;
const tbodyElem = document.getElementById('tbody') as HTMLTableSectionElement;

const bench = new Bench({
  iterations,
  warmupIterations: 3,
});

bench.addEventListener('warmup', () => {
  statusElem.textContent = '♨️ Warming up...';
});

bench.addEventListener('start', () => {
  document.getElementById('results-table')!.hidden = false;
  statusElem.textContent = '🚀 Running benchmarks...';
});

bench.addEventListener('complete', () => {
  statusElem.textContent = `📊 Results for ${iterations} iteration(s)`;
});

bench.addEventListener('cycle', (evt) => {
  const task = evt.task;
  if (!task?.result) {
    return;
  }

  const {p50, mad} = task.result.latency ?? {};
  let latencyMedian = 'NA';
  if (p50 !== undefined) {
    latencyMedian = p50.toLocaleString(undefined, {maximumFractionDigits: 3});
    if (mad) {
      latencyMedian = `${latencyMedian} &plusmn; ${mad.toLocaleString(undefined, {maximumFractionDigits: 3})}`;
    }
  }
  const row = document.createElement('tr');
  row.innerHTML = `<td>${task.name}</td><td>${latencyMedian}</td>`;
  tbodyElem.appendChild(row);
});

const zstd = await loadZSTDDecLib()
const zstdLoader = new ZstdVolumeLoader(zstd);
const nrrdLoader = new NRRDLoader();

for (const sample of samples) {
  bench.add(`${sample} - ZstdVolumeLoader`, () => zstdLoader.loadAsync(`/volumes/${sample}.raw.zst`));
  bench.add(`${sample} - NRRDLoader`, () => nrrdLoader.loadAsync(`/volumes/${sample}.gzip.nrrd`));
}

await bench.run();
