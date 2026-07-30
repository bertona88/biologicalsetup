import { readFile } from "node:fs/promises";
import { performance } from "node:perf_hooks";

const bytes = await readFile(
  new URL("../public/biological_engine.wasm", import.meta.url),
);

async function engine() {
  return (await WebAssembly.instantiate(bytes, {})).instance.exports;
}

function reset(exports, seed, preset) {
  if (exports.world_reset(seed >>> 0, 0, preset) !== 1) {
    throw new Error(`Could not reset preset ${preset}`);
  }
}

function round(value, digits = 1) {
  return Number(value.toFixed(digits));
}

function commonResult(exports, scenario, elapsedMilliseconds) {
  return {
    scenario,
    entities: exports.world_entity_count(),
    elapsedMilliseconds: round(elapsedMilliseconds, 2),
    wasmMemoryBytes: exports.memory.buffer.byteLength,
  };
}

async function benchmarkStepping({
  scenario,
  preset,
  requestedSeconds,
  iterations,
  setup,
}) {
  const exports = await engine();
  reset(exports, 424242, preset);
  if (setup) setup(exports);

  // One unmeasured call pays initialization and JIT costs before sampling.
  exports.world_advance(requestedSeconds);
  let performedSteps = 0;
  const start = performance.now();
  for (let index = 0; index < iterations; index += 1) {
    performedSteps += exports.world_advance(requestedSeconds);
  }
  const elapsedMilliseconds = performance.now() - start;

  return {
    ...commonResult(exports, scenario, elapsedMilliseconds),
    iterations,
    performedSteps,
    simulatedSeconds: round(requestedSeconds * iterations, 3),
    simulationStepsPerWallSecond: round(
      (performedSteps * 1_000) / elapsedMilliseconds,
    ),
    simulatedSecondsPerWallSecond: round(
      (requestedSeconds * iterations * 1_000) / elapsedMilliseconds,
    ),
  };
}

function placeCrowdedCulture(exports) {
  for (let index = 0; index < 2_000; index += 1) {
    const x = 4 + ((index * 37) % 392);
    const y = 4 + ((index * 61) % 252);
    const id = exports.world_place(1, x, y, 1);
    if (id === 0 || exports.world_last_status() !== 0) {
      throw new Error(`Could not place benchmark bacterium ${index + 1}`);
    }
  }
}

function copySnapshot(exports) {
  exports.world_prepare_snapshot();
  const memory = exports.memory.buffer;
  const entityFloats =
    exports.world_entity_count() * exports.world_entity_stride_f32();
  const fieldFloats =
    exports.world_field_width() * exports.world_field_height();
  const connectionFloats = exports.world_connection_count() * 4;

  const entities = Float32Array.from(
    new Float32Array(
      memory,
      exports.world_entities_ptr(),
      entityFloats,
    ),
  );
  const metrics = Float32Array.from(
    new Float32Array(
      memory,
      exports.world_metrics_ptr(),
      exports.world_metrics_len(),
    ),
  );
  const glucose = Float32Array.from(
    new Float32Array(memory, exports.world_field_ptr(0), fieldFloats),
  );
  const cue = Float32Array.from(
    new Float32Array(memory, exports.world_field_ptr(1), fieldFloats),
  );
  const connections = Float32Array.from(
    new Float32Array(
      memory,
      exports.world_connections_ptr(),
      connectionFloats,
    ),
  );

  return {
    bytesCopied:
      (entities.length +
        metrics.length +
        glucose.length +
        cue.length +
        connections.length) *
      Float32Array.BYTES_PER_ELEMENT,
    // Consume one value so the copies remain observably used.
    checksum:
      (entities.at(-1) ?? 0) +
      (metrics.at(-1) ?? 0) +
      (glucose.at(-1) ?? 0) +
      (cue.at(-1) ?? 0) +
      (connections.at(-1) ?? 0),
  };
}

async function benchmarkSnapshotExport() {
  const exports = await engine();
  reset(exports, 424242, 0);
  placeCrowdedCulture(exports);
  exports.world_advance(0.5);

  const warmup = copySnapshot(exports);
  const iterations = 250;
  let checksum = warmup.checksum;
  const start = performance.now();
  for (let index = 0; index < iterations; index += 1) {
    checksum += copySnapshot(exports).checksum;
  }
  const elapsedMilliseconds = performance.now() - start;

  return {
    ...commonResult(
      exports,
      "2,000-agent full snapshot preparation and JavaScript copy",
      elapsedMilliseconds,
    ),
    iterations,
    bytesCopiedPerSnapshot: warmup.bytesCopied,
    snapshotsPerWallSecond: round(
      (iterations * 1_000) / elapsedMilliseconds,
    ),
    checksum: round(checksum, 3),
  };
}

const scenarios = [
  await benchmarkStepping({
    scenario: "default host–microbe preset stepping",
    preset: 1,
    requestedSeconds: 0.5,
    iterations: 40,
  }),
  await benchmarkStepping({
    scenario: "2,000 motile bacteria plus two 64×42 fields",
    preset: 0,
    requestedSeconds: 0.5,
    iterations: 30,
    setup: placeCrowdedCulture,
  }),
  await benchmarkStepping({
    scenario: "40-neuron conductance network at 1 ms",
    preset: 3,
    requestedSeconds: 0.05,
    iterations: 40,
  }),
  await benchmarkSnapshotExport(),
];

console.log(
  JSON.stringify(
    {
      benchmark: "BiologicalSetup local profiling scenarios",
      gating: false,
      note:
        "Wall-time results vary by runtime and device. These measurements have no pass/fail threshold and are not release evidence.",
      runtime: {
        node: process.version,
        platform: process.platform,
        architecture: process.arch,
      },
      wasmBytes: bytes.byteLength,
      scenarios,
    },
    null,
    2,
  ),
);
