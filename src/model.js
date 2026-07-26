import { buildNeuronMorphology, makeBackgroundNuclei, makeNeuropil } from "./morphology.js";
import { clamp, gaussian, lerp, mulberry32, shuffle } from "./random.js";

export const PATCH_EXTENT_UM = Object.freeze({ width: 200, height: 200, depth: 40 });
export const EXPLICIT_NEURON_COUNT = 50;
export const MODEL_STEP_SECONDS = 0.002;

function createPositions(random) {
  const positions = [];
  let minimumDistance = 11.5;
  let attempts = 0;

  while (positions.length < EXPLICIT_NEURON_COUNT && attempts < 12_000) {
    attempts += 1;
    if (attempts === 4_000) minimumDistance = 10.4;
    if (attempts === 8_000) minimumDistance = 9.2;
    const candidate = {
      x: lerp(5, 195, random()),
      y: lerp(5, 195, random()),
      z: lerp(4, 36, random()),
    };
    const separated = positions.every((position) =>
      Math.hypot(candidate.x - position.x, candidate.y - position.y) >= minimumDistance);
    if (separated) positions.push(candidate);
  }

  if (positions.length !== EXPLICIT_NEURON_COUNT) {
    throw new Error(`Unable to place ${EXPLICIT_NEURON_COUNT} neurons in the patch`);
  }
  return positions;
}

function createNeuron(random, position, index, type) {
  const radiusBase = type === "excitatory" ? lerp(4.8, 7.3, random()) : lerp(4.1, 6.1, random());
  const neuron = {
    id: `N${String(index + 1).padStart(2, "0")}`,
    name: `Neuron ${String(index + 1).padStart(2, "0")}`,
    type,
    x: position.x,
    y: position.y,
    z: position.z,
    rotation: random() * Math.PI * 2,
    radiusX: radiusBase * (type === "excitatory" ? lerp(0.85, 1.15, random()) : 1),
    radiusY: radiusBase * lerp(0.84, 1.12, random()),
    nucleus: {
      offsetX: gaussian(random, 0, radiusBase * 0.13),
      offsetY: gaussian(random, 0, radiusBase * 0.13),
      radiusX: radiusBase * lerp(0.38, 0.53, random()),
      radiusY: radiusBase * lerp(0.34, 0.48, random()),
      rotation: random() * Math.PI,
    },
    restingPotentialMv: gaussian(random, type === "excitatory" ? -66 : -64.5, 1.5),
    thresholdMv: gaussian(random, type === "excitatory" ? -50.5 : -49.5, 1.1),
    resetPotentialMv: gaussian(random, -60.8, 0.8),
    membraneTauSeconds: lerp(0.014, 0.024, random()),
    spontaneousRateHz: type === "excitatory" ? lerp(0.025, 0.15, random()) : lerp(0.04, 0.2, random()),
    tonicDriveMvPerSecond: type === "excitatory" ? lerp(90, 210, random()) : lerp(110, 235, random()),
    calciumClearanceSeconds: lerp(0.52, 1.15, random()),
    indicatorRiseSeconds: lerp(0.028, 0.075, random()),
    indicatorDecaySeconds: lerp(0.24, 0.66, random()),
    outgoing: [],
    incomingCount: 0,
    state: {
      voltageMv: 0,
      refractorySeconds: 0,
      externalCurrent: 0,
      synapticCurrent: 0,
      noiseCurrent: gaussian(random, 0, 60),
      calcium: lerp(0.025, 0.055, random()),
      indicator: lerp(0.035, 0.07, random()),
      metabolic: lerp(0.91, 1, random()),
      stress: lerp(0, 0.025, random()),
      adaptation: 0,
      spikeGlow: 0,
      lastSpikeTime: -Infinity,
      spikeCount: 0,
      deformation: 0,
      deformationAngle: 0,
      selected: false,
    },
  };
  neuron.state.voltageMv = neuron.restingPotentialMv + lerp(0, 4.5, random());
  return buildNeuronMorphology(random, neuron);
}

function connectNetwork(random, neurons) {
  for (const source of neurons) {
    const candidates = neurons
      .filter((target) => target !== source)
      .map((target) => ({
        target,
        distance: Math.hypot(target.x - source.x, target.y - source.y),
      }))
      .filter(({ distance }) => distance < 96)
      .sort((a, b) => a.distance - b.distance);

    const desired = source.type === "excitatory"
      ? 3 + Math.floor(random() * 4)
      : 4 + Math.floor(random() * 4);
    const chosen = new Set();

    for (let attempt = 0; attempt < candidates.length * 2 && chosen.size < desired; attempt += 1) {
      const weightedIndex = Math.floor(Math.pow(random(), 1.8) * candidates.length);
      const candidate = candidates[Math.min(candidates.length - 1, weightedIndex)];
      if (!candidate || chosen.has(candidate.target.id)) continue;
      const probability = 0.84 * Math.exp(-candidate.distance / 76) + 0.08;
      if (random() > probability) continue;
      chosen.add(candidate.target.id);
      const sign = source.type === "inhibitory" ? -1 : 1;
      const magnitude = source.type === "inhibitory"
        ? lerp(520, 1120, random())
        : lerp(145, 460, random());
      source.outgoing.push({
        targetId: candidate.target.id,
        weightMvPerSecond: sign * magnitude,
        delaySeconds: lerp(0.0018, 0.0075, random()) + candidate.distance / 42_000,
        distanceUm: candidate.distance,
      });
      candidate.target.incomingCount += 1;
    }
  }
}

export function createRatCorticalPatch(seed = 0x20_26_07_26) {
  const normalizedSeed = Number(seed) >>> 0;
  const random = mulberry32(normalizedSeed);
  const positions = createPositions(random);
  const types = shuffle(
    random,
    Array.from({ length: EXPLICIT_NEURON_COUNT }, (_, index) =>
      index < 40 ? "excitatory" : "inhibitory"),
  );
  const neurons = positions.map((position, index) => createNeuron(random, position, index, types[index]));
  connectNetwork(random, neurons);

  const patch = {
    schemaVersion: 1,
    specimenId: "rat-cortical-patch-v2",
    seed: normalizedSeed,
    extentUm: { ...PATCH_EXTENT_UM },
    timeSeconds: 0,
    neurons,
    neuronById: new Map(neurons.map((neuron) => [neuron.id, neuron])),
    neuropil: makeNeuropil(random),
    backgroundNuclei: makeBackgroundNuclei(random),
    pendingSynapses: [],
    spikeWaves: [],
    pokeEvents: [],
    recentSpikeTimes: [],
    totalSpikes: 0,
    random,
  };

  return patch;
}

function queueSpike(patch, neuron) {
  neuron.state.voltageMv = neuron.resetPotentialMv;
  neuron.state.refractorySeconds = neuron.type === "inhibitory" ? 0.0032 : 0.0052;
  neuron.state.adaptation = clamp(neuron.state.adaptation + 330, 0, 820);
  neuron.state.calcium = clamp(
    neuron.state.calcium + (neuron.type === "inhibitory" ? 0.17 : 0.22),
    0,
    1.6,
  );
  neuron.state.metabolic = clamp(neuron.state.metabolic - 0.0028, 0.35, 1);
  neuron.state.spikeGlow = 1;
  neuron.state.lastSpikeTime = patch.timeSeconds;
  neuron.state.spikeCount += 1;
  neuron.state.externalCurrent *= 0.08;
  neuron.state.synapticCurrent *= 0.34;
  patch.totalSpikes += 1;
  patch.recentSpikeTimes.push(patch.timeSeconds);
  patch.spikeWaves.push({
    neuronId: neuron.id,
    startTime: patch.timeSeconds,
    polarity: neuron.type === "inhibitory" ? -1 : 1,
  });

  for (const connection of neuron.outgoing) {
    patch.pendingSynapses.push({
      targetId: connection.targetId,
      current: connection.weightMvPerSecond,
      deliveryTime: patch.timeSeconds + connection.delaySeconds,
      sourceId: neuron.id,
    });
  }
}

function deliverPendingSynapses(patch) {
  for (let index = patch.pendingSynapses.length - 1; index >= 0; index -= 1) {
    const event = patch.pendingSynapses[index];
    if (event.deliveryTime > patch.timeSeconds) continue;
    const target = patch.neuronById.get(event.targetId);
    if (target) {
      target.state.synapticCurrent += event.current;
      if (event.current > 0) target.state.calcium = clamp(target.state.calcium + 0.0025, 0, 1.6);
    }
    patch.pendingSynapses.splice(index, 1);
  }
}

function stepNeuron(patch, neuron, dt) {
  const state = neuron.state;
  const random = patch.random;

  state.externalCurrent *= Math.exp(-dt / 0.022);
  state.synapticCurrent *= Math.exp(-dt / 0.013);
  state.adaptation *= Math.exp(-dt / 0.34);
  state.noiseCurrent += (-state.noiseCurrent / 0.055) * dt + gaussian(random, 0, 710) * Math.sqrt(dt);

  if (random() < neuron.spontaneousRateHz * dt) {
    state.externalCurrent += lerp(850, 1850, random());
  }

  if (state.refractorySeconds > 0) {
    state.refractorySeconds = Math.max(0, state.refractorySeconds - dt);
    state.voltageMv = lerp(state.voltageMv, neuron.resetPotentialMv, Math.min(1, dt / 0.003));
  } else {
    const leak = (neuron.restingPotentialMv - state.voltageMv) / neuron.membraneTauSeconds;
    const metabolicPenalty = (1 - state.metabolic) * 190;
    const stressDrive = state.stress * 130;
    const voltageDerivative =
      leak +
      neuron.tonicDriveMvPerSecond +
      state.externalCurrent +
      state.synapticCurrent +
      state.noiseCurrent +
      stressDrive -
      state.adaptation -
      metabolicPenalty;
    state.voltageMv += voltageDerivative * dt;
    if (state.voltageMv >= neuron.thresholdMv) queueSpike(patch, neuron);
  }

  const calciumBaseline = 0.03;
  state.calcium += (calciumBaseline - state.calcium) * (dt / neuron.calciumClearanceSeconds);
  const indicatorTarget = state.calcium / (0.14 + state.calcium);
  const indicatorTau = indicatorTarget > state.indicator
    ? neuron.indicatorRiseSeconds
    : neuron.indicatorDecaySeconds;
  state.indicator += (indicatorTarget - state.indicator) * (dt / indicatorTau);

  const metabolicRecovery = 0.026 * (1 - state.metabolic);
  const activityCost = Math.max(0, state.calcium - 0.16) * 0.006;
  state.metabolic = clamp(state.metabolic + (metabolicRecovery - activityCost) * dt, 0.35, 1);
  state.stress = clamp(state.stress * Math.exp(-dt / 15), 0, 1);
  state.spikeGlow *= Math.exp(-dt / 0.085);
  state.deformation *= Math.exp(-dt / 0.28);
}

export function stepPatch(patch, dt = MODEL_STEP_SECONDS) {
  const safeDt = clamp(Number(dt) || 0, 0, 0.01);
  if (safeDt <= 0) return patch;
  patch.timeSeconds += safeDt;
  deliverPendingSynapses(patch);
  for (const neuron of patch.neurons) stepNeuron(patch, neuron, safeDt);

  const recentCutoff = patch.timeSeconds - 2;
  while (patch.recentSpikeTimes.length && patch.recentSpikeTimes[0] < recentCutoff) {
    patch.recentSpikeTimes.shift();
  }
  patch.spikeWaves = patch.spikeWaves.filter((wave) => patch.timeSeconds - wave.startTime < 0.85);
  patch.pokeEvents = patch.pokeEvents.filter((event) => patch.timeSeconds - event.time < 0.9);
  return patch;
}

function squaredDistanceToSegment(pointX, pointY, start, end) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const lengthSquared = dx * dx + dy * dy;
  if (lengthSquared === 0) return (pointX - start.x) ** 2 + (pointY - start.y) ** 2;
  const amount = clamp(((pointX - start.x) * dx + (pointY - start.y) * dy) / lengthSquared, 0, 1);
  const x = start.x + dx * amount;
  const y = start.y + dy * amount;
  return (pointX - x) ** 2 + (pointY - y) ** 2;
}

function neuronHitDistance(neuron, x, y) {
  const somaDistance = Math.hypot(x - neuron.x, y - neuron.y) - Math.max(neuron.radiusX, neuron.radiusY);
  let minimum = somaDistance;
  for (const path of neuron.dendrites) {
    for (let index = 1; index < path.length; index += 2) {
      const distance = Math.sqrt(squaredDistanceToSegment(x, y, path[index - 1], path[index]));
      minimum = Math.min(minimum, distance - path[index].radius * 1.7);
    }
  }
  return minimum;
}

export function findNearestNeuron(patch, xUm, yUm, maximumDistanceUm = 16) {
  let best = null;
  let bestDistance = maximumDistanceUm;
  for (const neuron of patch.neurons) {
    const distance = neuronHitDistance(neuron, xUm, yUm);
    if (distance < bestDistance) {
      best = neuron;
      bestDistance = distance;
    }
  }
  return best ? { neuron: best, distanceUm: bestDistance } : null;
}

export function stimulateNeuron(patch, neuronId, strength = 1, angle = 0) {
  const neuron = patch.neuronById.get(neuronId);
  if (!neuron) return null;
  const force = clamp(Number(strength) || 0, 0, 2.5);
  neuron.state.externalCurrent += 1250 * force;
  const stimulatedVoltage = neuron.state.voltageMv + 12.5 * force;
  neuron.state.voltageMv = clamp(
    force >= 0.9 && neuron.state.refractorySeconds <= 0
      ? Math.max(stimulatedVoltage, neuron.thresholdMv + 0.05)
      : stimulatedVoltage,
    -90,
    neuron.thresholdMv + 0.5,
  );
  neuron.state.deformation = clamp(neuron.state.deformation + 0.72 * force, 0, 1.6);
  neuron.state.deformationAngle = angle;
  neuron.state.stress = clamp(neuron.state.stress + 0.006 * force * force, 0, 1);
  return neuron;
}

export function pokePatch(patch, xUm, yUm, strength = 1) {
  const hit = findNearestNeuron(patch, xUm, yUm, 18);
  patch.pokeEvents.push({
    x: xUm,
    y: yUm,
    time: patch.timeSeconds,
    hitNeuronId: hit?.neuron.id ?? null,
    strength: clamp(strength, 0, 2.5),
  });
  if (!hit) return null;
  const angle = Math.atan2(yUm - hit.neuron.y, xUm - hit.neuron.x);
  const distanceAttenuation = clamp(1 - Math.max(0, hit.distanceUm) / 18, 0.18, 1);
  return stimulateNeuron(patch, hit.neuron.id, strength * distanceAttenuation, angle);
}

export function getPatchMetrics(patch) {
  const recentSpikeRateHz = patch.recentSpikeTimes.length / 2;
  let meanCalcium = 0;
  let meanMetabolic = 0;
  let activeNeurons = 0;
  for (const neuron of patch.neurons) {
    meanCalcium += neuron.state.calcium;
    meanMetabolic += neuron.state.metabolic;
    if (patch.timeSeconds - neuron.state.lastSpikeTime < 0.5) activeNeurons += 1;
  }
  return {
    timeSeconds: patch.timeSeconds,
    totalSpikes: patch.totalSpikes,
    recentSpikeRateHz,
    activeNeurons,
    meanCalcium: meanCalcium / patch.neurons.length,
    meanMetabolic: meanMetabolic / patch.neurons.length,
    pendingSynapses: patch.pendingSynapses.length,
  };
}

export function serializePatchView(patch, view = {}) {
  return {
    version: 1,
    specimen: patch.specimenId,
    seed: patch.seed,
    view: {
      modality: ["phase", "calcium", "shg", "srs"].includes(view.modality)
        ? view.modality
        : "phase",
      focusUm: clamp(Number(view.focusUm ?? 20), 0, PATCH_EXTENT_UM.depth),
      exposure: clamp(Number(view.exposure ?? 1), 0.45, 1.8),
      polarizationDegrees: clamp(Number(view.polarizationDegrees ?? 28), 0, 180),
      srsBand: ["composite", "lipid", "protein"].includes(view.srsBand)
        ? view.srsBand
        : "composite",
    },
  };
}
