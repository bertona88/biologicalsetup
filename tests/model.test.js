import assert from "node:assert/strict";
import test from "node:test";
import {
  createRatCorticalPatch,
  getPatchMetrics,
  MODEL_STEP_SECONDS,
  serializePatchView,
  stimulateNeuron,
  stepPatch,
} from "../src/model.js";

function advance(patch, seconds) {
  const steps = Math.ceil(seconds / MODEL_STEP_SECONDS);
  for (let index = 0; index < steps; index += 1) stepPatch(patch, MODEL_STEP_SECONDS);
}

test("rat cortical preset contains the declared explicit population", () => {
  const patch = createRatCorticalPatch(1234);
  assert.equal(patch.extentUm.width, 200);
  assert.equal(patch.extentUm.height, 200);
  assert.equal(patch.extentUm.depth, 40);
  assert.equal(patch.neurons.length, 50);
  assert.equal(patch.neurons.filter((neuron) => neuron.type === "excitatory").length, 40);
  assert.equal(patch.neurons.filter((neuron) => neuron.type === "inhibitory").length, 10);
  assert.ok(patch.neuropil.length >= 150);
  assert.ok(patch.backgroundNuclei.length >= 60);
});

test("each explicit neuron has morphology, cellular state and subcellular traffic", () => {
  const patch = createRatCorticalPatch(9);
  for (const neuron of patch.neurons) {
    assert.ok(neuron.contour.length >= 20);
    assert.ok(neuron.dendrites.length >= 5);
    assert.ok(neuron.axon.length >= 20);
    assert.ok(neuron.organelles.mitochondria.length >= 5);
    assert.ok(neuron.organelles.vesicles.length >= 16);
    assert.ok(Number.isFinite(neuron.state.voltageMv));
    assert.ok(neuron.state.metabolic > 0 && neuron.state.metabolic <= 1);
  }
});

test("the specimen is deterministic for a fixed seed", () => {
  const first = createRatCorticalPatch(2026);
  const second = createRatCorticalPatch(2026);
  const projection = (patch) => patch.neurons.slice(0, 5).map((neuron) => ({
    id: neuron.id,
    type: neuron.type,
    x: neuron.x,
    y: neuron.y,
    z: neuron.z,
    outgoing: neuron.outgoing,
    firstDendriteEnd: neuron.dendrites[0].at(-1),
  }));
  assert.deepEqual(projection(first), projection(second));
});

test("default activity stays sparse rather than entering a runaway loop", () => {
  const patch = createRatCorticalPatch(123);
  advance(patch, 5);
  const metrics = getPatchMetrics(patch);
  assert.ok(metrics.totalSpikes > 0, "the living specimen should not be completely silent");
  assert.ok(metrics.totalSpikes < 120, `unexpected runaway activity: ${metrics.totalSpikes} spikes`);
  assert.ok(metrics.meanMetabolic > 0.8);
  for (const neuron of patch.neurons) {
    assert.ok(Number.isFinite(neuron.state.voltageMv));
    assert.ok(neuron.state.calcium >= 0 && neuron.state.calcium <= 1.6);
  }
});

test("a deliberate poke makes a non-refractory neuron fire", () => {
  const patch = createRatCorticalPatch(456);
  const neuron = patch.neurons[0];
  const before = neuron.state.spikeCount;
  stimulateNeuron(patch, neuron.id, 1);
  advance(patch, 0.02);
  assert.ok(neuron.state.spikeCount > before);
  assert.ok(neuron.state.calcium > 0.05);
  assert.ok(patch.spikeWaves.some((wave) => wave.neuronId === neuron.id));
});

test("connection signs follow excitatory and inhibitory identity", () => {
  const patch = createRatCorticalPatch(77);
  for (const neuron of patch.neurons) {
    assert.ok(neuron.outgoing.length >= 2);
    for (const connection of neuron.outgoing) {
      if (neuron.type === "excitatory") assert.ok(connection.weightMvPerSecond > 0);
      else assert.ok(connection.weightMvPerSecond < 0);
      assert.ok(connection.delaySeconds > 0);
    }
  }
});

test("shared view state is bounded and does not serialize hidden biological state", () => {
  const patch = createRatCorticalPatch(11);
  const state = serializePatchView(patch, {
    modality: "srs",
    focusUm: 900,
    exposure: 9,
    polarizationDegrees: -20,
    srsBand: "lipid",
  });
  assert.deepEqual(state.view, {
    modality: "srs",
    focusUm: 40,
    exposure: 1.8,
    polarizationDegrees: 0,
    srsBand: "lipid",
  });
  assert.equal("neurons" in state, false);
});
