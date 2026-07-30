import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

const bytes = await readFile(
  new URL("../public/biological_engine.wasm", import.meta.url),
);

async function instantiate() {
  const { instance } = await WebAssembly.instantiate(bytes, {});
  return instance.exports;
}

function reset(exports, seed, preset) {
  const value = BigInt(seed);
  const low = Number(value & 0xffff_ffffn);
  const high = Number((value >> 32n) & 0xffff_ffffn);
  assert.equal(exports.world_reset(low, high, preset), 1);
}

function hash(exports) {
  // WebAssembly i32 results arrive in JavaScript as signed numbers even when
  // the Rust ABI declares u32. Coerce each word before composing the hash so a
  // high bit in the low word cannot sign-extend over the high word.
  const low = BigInt(exports.world_state_hash_low() >>> 0);
  const high = BigInt(exports.world_state_hash_high() >>> 0);
  return (high << 32n) | low;
}

function copyFloats(memory, pointer, length) {
  return Float32Array.from(new Float32Array(memory, pointer, length));
}

function frame(exports) {
  exports.world_prepare_snapshot();
  const memory = exports.memory.buffer;
  const count = exports.world_entity_count();
  const stride = exports.world_entity_stride_f32();
  const fieldWidth = exports.world_field_width();
  const fieldHeight = exports.world_field_height();
  const fieldLength = fieldWidth * fieldHeight;
  const connectionCount = exports.world_connection_count();
  return {
    entities: copyFloats(
      memory,
      exports.world_entities_ptr(),
      count * stride,
    ),
    metrics: copyFloats(
      memory,
      exports.world_metrics_ptr(),
      exports.world_metrics_len(),
    ),
    glucose: copyFloats(
      memory,
      exports.world_field_ptr(0),
      fieldLength,
    ),
    cue: copyFloats(
      memory,
      exports.world_field_ptr(1),
      fieldLength,
    ),
    connections: copyFloats(
      memory,
      exports.world_connections_ptr(),
      connectionCount * 4,
    ),
    count,
    stride,
    fieldWidth,
    fieldHeight,
    connectionCount,
  };
}

function entityById(snapshot, id) {
  for (
    let offset = 0;
    offset < snapshot.entities.length;
    offset += snapshot.stride
  ) {
    if (snapshot.entities[offset] === id) {
      return snapshot.entities.slice(offset, offset + snapshot.stride);
    }
  }
  return undefined;
}

function fieldTotal(values) {
  let total = 0;
  for (const value of values) total += value;
  return total;
}

function place(exports, kind, x, y, amount = 1) {
  const id = exports.world_place(kind, x, y, amount);
  assert.equal(exports.world_last_status(), 0);
  return id;
}

function runOrderedExperiment(exports, reordered = false) {
  reset(exports, 164271829n, 0);
  let bacterium;

  if (reordered) {
    bacterium = place(exports, 1, 150, 130);
    exports.world_advance(0.05);
    place(exports, 10, 150, 130, 1.5);
  } else {
    place(exports, 10, 150, 130, 1.5);
    exports.world_advance(0.05);
    bacterium = place(exports, 1, 150, 130);
  }

  exports.world_advance(0.5);
  place(exports, 11, 245, 130, 2);
  const phagocyte = place(exports, 2, 245, 130);
  exports.world_advance(2);
  return { bacterium, phagocyte };
}

test("WebAssembly ABI exports the declared coarse bridge", async () => {
  const exports = await instantiate();
  assert.equal(exports.engine_version(), 1);
  for (const name of [
    "world_reset",
    "world_advance",
    "world_place",
    "world_remove_at",
    "world_stimulate",
    "world_select_at",
    "world_last_status",
    "world_entity_count",
    "world_prepare_snapshot",
    "world_entities_ptr",
    "world_entity_stride_f32",
    "world_field_ptr",
    "world_field_width",
    "world_field_height",
    "world_metrics_ptr",
    "world_metrics_len",
    "world_connections_ptr",
    "world_connection_count",
    "world_state_hash_low",
    "world_state_hash_high",
  ]) {
    assert.equal(typeof exports[name], "function", `${name} should be exported`);
  }
  assert.ok(exports.memory instanceof WebAssembly.Memory);
});

test("same seed and ordered actions reproduce every exported array", async () => {
  const left = await instantiate();
  const right = await instantiate();

  const leftIds = runOrderedExperiment(left);
  const rightIds = runOrderedExperiment(right);
  assert.deepEqual(rightIds, leftIds);
  assert.deepEqual(frame(right), frame(left));
  assert.equal(hash(left), hash(right));

  const reordered = await instantiate();
  runOrderedExperiment(reordered, true);
  assert.notDeepEqual(
    frame(reordered),
    frame(left),
    "changing the ordered perturbation sequence should change the result",
  );
});

test("glucose placement changes only glucose and adds no entity", async () => {
  const exports = await instantiate();
  reset(exports, 8n, 0);
  const before = frame(exports);
  assert.equal(exports.world_place(10, 200, 130, 1), 0);
  assert.equal(exports.world_last_status(), 0);
  exports.world_advance(0.05);
  const after = frame(exports);
  assert.equal(after.count, before.count);
  assert.ok(fieldTotal(after.glucose) > fieldTotal(before.glucose));
  assert.deepEqual(after.cue, before.cue);
});

test("cue placement changes only cue and adds no entity", async () => {
  const exports = await instantiate();
  reset(exports, 81n, 0);
  const before = frame(exports);
  assert.equal(exports.world_place(11, 200, 130, 2), 0);
  assert.equal(exports.world_last_status(), 0);
  exports.world_advance(0.05);
  const after = frame(exports);
  assert.equal(after.count, before.count);
  assert.ok(fieldTotal(after.cue) > fieldTotal(before.cue));
  assert.deepEqual(after.glucose, before.glucose);
});

test("a bacterium depletes glucose while total biomass increases", async () => {
  const treatment = await instantiate();
  const noBacterium = await instantiate();
  reset(treatment, 10n, 0);
  reset(noBacterium, 10n, 0);

  const bacterium = place(treatment, 1, 200, 130);
  const before = frame(treatment);
  assert.ok(entityById(before, bacterium));
  treatment.world_advance(20);
  noBacterium.world_advance(20);

  const after = frame(treatment);
  const control = frame(noBacterium);
  assert.ok(after.metrics[8] > before.metrics[8], "biomass should increase");
  assert.ok(
    fieldTotal(after.glucose) < fieldTotal(control.glucose),
    "the bacterium should remove glucose relative to an entity-free control",
  );
  assert.ok(after.glucose.every((value) => Number.isFinite(value) && value >= 0));
});

test("engulfment requires finite progress, removes the target, and adds cargo", async () => {
  const exports = await instantiate();
  reset(exports, 11n, 0);
  const bacterium = place(exports, 1, 200, 130);
  const phagocyte = place(exports, 2, 200, 130);

  exports.world_advance(1);
  assert.ok(
    entityById(frame(exports), bacterium),
    "contact alone must not delete a bacterium",
  );

  exports.world_advance(20);
  const after = frame(exports);
  assert.equal(entityById(after, bacterium), undefined);
  const phagocyteState = entityById(after, phagocyte);
  assert.ok(phagocyteState, "the phagocyte should remain live");
  assert.ok(phagocyteState[6] >= 1, "engulfment should increment cargo");
  assert.equal(after.metrics[10], 1);
});

test("a static cue biases phagocyte displacement on average", async () => {
  const relativeDisplacements = [];
  for (let seed = 1; seed <= 6; seed += 1) {
    const treatment = await instantiate();
    const noCue = await instantiate();
    reset(treatment, BigInt(seed), 0);
    reset(noCue, BigInt(seed), 0);
    const treatmentId = place(treatment, 2, 100, 130);
    const controlId = place(noCue, 2, 100, 130);
    place(treatment, 11, 150, 130, 5);

    treatment.world_advance(10);
    noCue.world_advance(10);
    const treatmentState = entityById(frame(treatment), treatmentId);
    const controlState = entityById(frame(noCue), controlId);
    assert.ok(treatmentState && controlState);
    relativeDisplacements.push(treatmentState[2] - controlState[2]);
  }

  const mean =
    relativeDisplacements.reduce((sum, value) => sum + value, 0) /
    relativeDisplacements.length;
  assert.ok(
    mean > 0.5,
    `mean cue-directed x displacement should exceed control; observed ${mean}`,
  );
  assert.ok(
    relativeDisplacements.filter((value) => value > 0).length >= 5,
    `expected at least five positive paired displacements; observed ${relativeDisplacements}`,
  );
});

test("culture chassis rejects neural entities explicitly", async () => {
  const exports = await instantiate();
  reset(exports, 9n, 0);
  assert.equal(exports.world_place(4, 120, 100, 1), 0);
  assert.equal(exports.world_last_status(), 2);
});

test("neural stimulus depolarizes its target before spike-linked indicator rise", async () => {
  const treatment = await instantiate();
  const unstimulated = await instantiate();
  reset(treatment, 10n, 3);
  reset(unstimulated, 10n, 3);
  const before = frame(treatment);
  const x = before.entities[2];
  const y = before.entities[3];
  const id = treatment.world_stimulate(x, y, 2);
  assert.ok(id > 0);
  assert.equal(treatment.world_last_status(), 0);

  treatment.world_advance(0.001);
  unstimulated.world_advance(0.001);
  const earlyTreatment = frame(treatment);
  const earlyControl = frame(unstimulated);
  const earlyTarget = entityById(earlyTreatment, id);
  const earlyControlTarget = entityById(earlyControl, id);
  assert.ok(earlyTarget && earlyControlTarget);
  assert.ok(earlyTarget[6] > earlyControlTarget[6] + 5);
  assert.equal(earlyTarget[7], 0);
  assert.equal(earlyTreatment.metrics[11], earlyControl.metrics[11]);

  treatment.world_advance(0.001);
  unstimulated.world_advance(0.001);
  const after = frame(treatment);
  const control = frame(unstimulated);
  const target = entityById(after, id);
  assert.ok(target);
  assert.ok(after.metrics[11] > control.metrics[11]);
  assert.ok(target[7] > 0);
});

test("reading snapshots and fields does not mutate biological state", async () => {
  const exports = await instantiate();
  reset(exports, 11n, 1);
  exports.world_advance(1);
  const beforeFrame = frame(exports);
  const before = hash(exports);
  exports.world_prepare_snapshot();
  exports.world_entities_ptr();
  exports.world_metrics_ptr();
  exports.world_field_ptr(0);
  exports.world_field_ptr(1);
  exports.world_connections_ptr();
  exports.world_connection_count();
  const after = hash(exports);
  const afterFrame = frame(exports);
  assert.equal(after, before);
  assert.deepEqual(afterFrame, beforeFrame);
});
