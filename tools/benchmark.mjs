import { readFile } from "node:fs/promises";
import { performance } from "node:perf_hooks";

const bytes = await readFile(
  new URL("../public/biological_engine.wasm", import.meta.url),
);

async function engine() {
  return (await WebAssembly.instantiate(bytes, {})).instance.exports;
}

function reset(exports, seed, preset) {
  exports.world_reset(seed >>> 0, 0, preset);
}

async function benchmarkCulture() {
  const exports = await engine();
  reset(exports, 424242, 0);
  for (let index = 0; index < 2_000; index += 1) {
    const x = 4 + ((index * 37) % 392);
    const y = 4 + ((index * 61) % 252);
    exports.world_place(1, x, y, 1);
  }
  exports.world_advance(0.5);
  const start = performance.now();
  const iterations = 30;
  for (let index = 0; index < iterations; index += 1) {
    exports.world_advance(0.5);
    exports.world_prepare_snapshot();
  }
  const elapsed = performance.now() - start;
  return {
    scenario: "2,000 motile bacteria + two 64x42 fields",
    entities: exports.world_entity_count(),
    simulatedSeconds: iterations * 0.5,
    elapsedMilliseconds: Number(elapsed.toFixed(2)),
    simulatedSecondsPerWallSecond: Number(
      ((iterations * 0.5 * 1_000) / elapsed).toFixed(1),
    ),
    wasmBytes: bytes.byteLength,
    memoryBytes: exports.memory.buffer.byteLength,
  };
}

async function benchmarkNeural() {
  const exports = await engine();
  reset(exports, 424242, 3);
  exports.world_advance(0.05);
  const start = performance.now();
  const iterations = 40;
  for (let index = 0; index < iterations; index += 1) {
    exports.world_advance(0.05);
    exports.world_prepare_snapshot();
  }
  const elapsed = performance.now() - start;
  return {
    scenario: "40-neuron conductance network at 1 ms",
    entities: exports.world_entity_count(),
    simulatedSeconds: iterations * 0.05,
    elapsedMilliseconds: Number(elapsed.toFixed(2)),
    simulatedSecondsPerWallSecond: Number(
      ((iterations * 0.05 * 1_000) / elapsed).toFixed(1),
    ),
    wasmBytes: bytes.byteLength,
    memoryBytes: exports.memory.buffer.byteLength,
  };
}

console.log(JSON.stringify(await benchmarkCulture(), null, 2));
console.log(JSON.stringify(await benchmarkNeural(), null, 2));

