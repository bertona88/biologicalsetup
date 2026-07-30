export const PRESETS = Object.freeze({
  BLANK: 0,
  HOST_MICROBE: 1,
  PURSUIT: 2,
  CORTICAL: 3,
});

export const ENTITY_KIND = Object.freeze({
  BACTERIUM: 1,
  PHAGOCYTE: 2,
  EPITHELIUM: 3,
  NEURON_EXCITATORY: 4,
  NEURON_INHIBITORY: 5,
  GLUCOSE: 10,
  CUE: 11,
});

export const STATUS = Object.freeze({
  0: "ok",
  1: "invalid action",
  2: "incompatible with this model chassis",
  3: "engine capacity reached",
  4: "time backlog dropped to protect responsiveness",
});

const EXPECTED_ABI = 1;

export class BiologicalEngine {
  static async load() {
    const url = new URL("/biological_engine.wasm", window.location.origin);
    let result;
    try {
      result = await WebAssembly.instantiateStreaming(fetch(url), {});
    } catch {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Could not load simulation engine (${response.status})`);
      }
      result = await WebAssembly.instantiate(await response.arrayBuffer(), {});
    }

    const engine = new BiologicalEngine(result.instance);
    if (engine.exports.engine_version() !== EXPECTED_ABI) {
      throw new Error(
        `Incompatible engine ABI ${engine.exports.engine_version()}; expected ${EXPECTED_ABI}`,
      );
    }
    return engine;
  }

  constructor(instance) {
    this.instance = instance;
    this.exports = instance.exports;
    this.memory = instance.exports.memory;
  }

  reset(seed, preset) {
    const numericSeed = BigInt.asUintN(64, BigInt(seed));
    const low = Number(numericSeed & 0xffff_ffffn);
    const high = Number((numericSeed >> 32n) & 0xffff_ffffn);
    return this.exports.world_reset(low, high, preset) === 1;
  }

  advance(seconds) {
    return this.exports.world_advance(seconds);
  }

  place(kind, xUm, yUm, amount = 1) {
    const id = this.exports.world_place(kind, xUm, yUm, amount);
    return { id, status: this.status };
  }

  removeAt(xUm, yUm, radiusUm = 10) {
    return this.exports.world_remove_at(xUm, yUm, radiusUm);
  }

  stimulate(xUm, yUm, strength = 1) {
    return this.exports.world_stimulate(xUm, yUm, strength);
  }

  selectAt(xUm, yUm, radiusUm = 10) {
    return this.exports.world_select_at(xUm, yUm, radiusUm);
  }

  get statusCode() {
    return this.exports.world_last_status();
  }

  get status() {
    return STATUS[this.statusCode] ?? `unknown engine status ${this.statusCode}`;
  }

  readFrame() {
    this.exports.world_prepare_snapshot();
    const buffer = this.memory.buffer;
    const count = this.exports.world_entity_count();
    const stride = this.exports.world_entity_stride_f32();
    const entities = new Float32Array(
      buffer,
      this.exports.world_entities_ptr(),
      count * stride,
    );
    const metrics = new Float32Array(
      buffer,
      this.exports.world_metrics_ptr(),
      this.exports.world_metrics_len(),
    );
    const fieldWidth = this.exports.world_field_width();
    const fieldHeight = this.exports.world_field_height();
    const fieldLength = fieldWidth * fieldHeight;
    const glucose = new Float32Array(
      buffer,
      this.exports.world_field_ptr(0),
      fieldLength,
    );
    const cue = new Float32Array(
      buffer,
      this.exports.world_field_ptr(1),
      fieldLength,
    );
    const connectionCount = this.exports.world_connection_count();
    const connections = new Float32Array(
      buffer,
      this.exports.world_connections_ptr(),
      connectionCount * 4,
    );
    return {
      entities,
      metrics,
      glucose,
      cue,
      connections,
      count,
      stride,
      fieldWidth,
      fieldHeight,
    };
  }

  stateHash() {
    const low = BigInt(this.exports.world_state_hash_low() >>> 0);
    const high = BigInt(this.exports.world_state_hash_high() >>> 0);
    return (high << 32n) | low;
  }
}
