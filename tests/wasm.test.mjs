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
  const low = BigInt(exports.world_state_hash_low());
  const high = BigInt(exports.world_state_hash_high());
  return (high << 32n) | low;
}

function frame(exports) {
  exports.world_prepare_snapshot();
  const memory = exports.memory.buffer;
  const count = exports.world_entity_count();
  const stride = exports.world_entity_stride_f32();
  return {
    entities: Float32Array.from(
      new Float32Array(
        memory,
        exports.world_entities_ptr(),
        count * stride,
      ),
    ),
    metrics: Float32Array.from(
      new Float32Array(
        memory,
        exports.world_metrics_ptr(),
        exports.world_metrics_len(),
      ),
    ),
    count,
    stride,
  };
}

test("WebAssembly ABI exports the complete coarse bridge", async () => {
  const exports = await instantiate();
  assert.equal(exports.engine_version(), 1);
  for (const name of [
    "world_reset",
    "world_advance",
    "world_place",
    "world_remove_at",
    "world_stimulate",
    "world_prepare_snapshot",
    "world_entities_ptr",
    "world_field_ptr",
    "world_metrics_ptr",
  ]) {
    assert.equal(typeof exports[name], "function", `${name} should be exported`);
  }
});

test("same seed and duration reproduce the same state hash", async () => {
  const left = await instantiate();
  const right = await instantiate();
  reset(left, 164271829n, 1);
  reset(right, 164271829n, 1);
  left.world_advance(12);
  right.world_advance(12);
  assert.equal(hash(left), hash(right));
});

test("field placement changes chemistry without adding an entity", async () => {
  const exports = await instantiate();
  reset(exports, 8n, 0);
  const before = frame(exports);
  const entityCount = before.count;
  const glucoseBefore = before.metrics[6];
  assert.equal(exports.world_place(10, 200, 130, 1), 0);
  assert.equal(exports.world_last_status(), 0);
  exports.world_advance(0.05);
  const after = frame(exports);
  assert.equal(after.count, entityCount);
  assert.ok(after.metrics[6] > glucoseBefore);
});

test("culture chassis rejects neural entities explicitly", async () => {
  const exports = await instantiate();
  reset(exports, 9n, 0);
  assert.equal(exports.world_place(4, 120, 100, 1), 0);
  assert.equal(exports.world_last_status(), 2);
});

test("neural stimulus produces spike and indicator state", async () => {
  const exports = await instantiate();
  reset(exports, 10n, 3);
  const before = frame(exports);
  const x = before.entities[2];
  const y = before.entities[3];
  const id = exports.world_stimulate(x, y, 2);
  assert.ok(id > 0);
  exports.world_advance(0.02);
  const after = frame(exports);
  assert.ok(after.metrics[11] > before.metrics[11]);
  let calcium = 0;
  for (let offset = 0; offset < after.entities.length; offset += after.stride) {
    if (after.entities[offset] === id) {
      calcium = after.entities[offset + 7];
    }
  }
  assert.ok(calcium > 0);
});

test("reading snapshots and fields does not mutate biological state", async () => {
  const exports = await instantiate();
  reset(exports, 11n, 1);
  exports.world_advance(1);
  const before = hash(exports);
  frame(exports);
  exports.world_field_ptr(0);
  exports.world_field_ptr(1);
  exports.world_connection_count();
  const after = hash(exports);
  assert.equal(after, before);
});
