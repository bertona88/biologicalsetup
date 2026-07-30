import { ENTITY_KIND, PRESETS } from "./engine.js";

export const PRESET_CATALOG = Object.freeze({
  [PRESETS.BLANK]: {
    id: "blank",
    name: "Blank culture slide",
    family: "CULTURE CHASSIS · v1",
    rateOptions: [1, 10, 30],
    defaultRate: 10,
    primaryMetric: ["Bacteria", 2, "cells"],
    secondaryMetric: ["Mean glucose", 6, "mM"],
    tertiaryMetric: ["Engulfed", 10, "events"],
    chart: ["Bacteria", 2, "Glucose", 6],
  },
  [PRESETS.HOST_MICROBE]: {
    id: "host-microbe",
    name: "Host–microbe frontier",
    family: "CULTURE CHASSIS · v1",
    rateOptions: [1, 10, 30],
    defaultRate: 10,
    primaryMetric: ["Bacteria", 2, "cells"],
    secondaryMetric: ["Mean glucose", 6, "mM"],
    tertiaryMetric: ["Engulfed", 10, "events"],
    chart: ["Bacteria", 2, "Glucose", 6],
  },
  [PRESETS.PURSUIT]: {
    id: "pursuit",
    name: "Phagocyte pursuit",
    family: "IMMUNE ENCOUNTER · v1",
    rateOptions: [1, 10, 30],
    defaultRate: 30,
    primaryMetric: ["Bacteria", 2, "cells"],
    secondaryMetric: ["Cue maximum", 7, "nM-eq"],
    tertiaryMetric: ["Engulfed", 10, "events"],
    chart: ["Bacteria", 2, "Cue", 7],
  },
  [PRESETS.CORTICAL]: {
    id: "cortical",
    name: "Cortical microcircuit",
    family: "NEURAL CHASSIS · reduced LIF v1",
    rateOptions: [0.5, 1, 2],
    defaultRate: 1,
    primaryMetric: ["Neurons", 5, "cells"],
    secondaryMetric: ["Spikes", 11, "events"],
    tertiaryMetric: ["Queued", 14, "synapses"],
    chart: ["Spikes", 11, "Calcium", "calcium"],
  },
});

export const ENTITY_CATALOG = Object.freeze({
  [ENTITY_KIND.BACTERIUM]: {
    name: "Motile bacterium",
    short: "Bacterium",
    scientificName: "E. coli-like reduced agent",
    values: [
      ["Biomass", 6, "pg"],
      ["Fast sensor", 7, "mM"],
      ["Slow sensor", 8, "mM"],
      ["Growth rate", 9, "h⁻¹"],
    ],
    note: "Illustrative parameters; Monod growth and temporal sensing are mechanism-grounded, not culture-calibrated.",
    reference: "bacterial-growth",
  },
  [ENTITY_KIND.PHAGOCYTE]: {
    name: "Neutrophil-like phagocyte",
    short: "Phagocyte",
    scientificName: "Reduced motile immune agent",
    values: [
      ["Cargo", 6, "bacteria"],
      ["Cup progress", 7, "fraction"],
      ["Local cue", 8, "nM-eq"],
      ["Digestion timer", 9, "s"],
    ],
    note: "Cue following and finite engulfment are qualitative. No receptor, phagosome, or killing chemistry is represented.",
    reference: "phagocytosis",
  },
  [ENTITY_KIND.EPITHELIUM]: {
    name: "Epithelial-like host cell",
    short: "Host cell",
    scientificName: "Stationary phenomenological agent",
    values: [
      ["Stress proxy", 6, "0–1"],
      ["Local burden", 7, "bacteria"],
      ["Local cue", 8, "nM-eq"],
      ["State", 9, "proxy"],
    ],
    note: "Stress is a bounded project-defined proxy. It is not viability, toxicity, inflammation, or barrier failure.",
    reference: "epithelial-stress",
  },
  [ENTITY_KIND.NEURON_EXCITATORY]: {
    name: "Excitatory neuron",
    short: "Excitatory neuron",
    scientificName: "Reduced leaky integrate-and-fire agent",
    values: [
      ["Membrane voltage", 6, "mV"],
      ["Calcium indicator", 7, "proxy"],
      ["Exc. conductance", 8, "nS"],
      ["Inh. conductance", 9, "nS"],
    ],
    note: "Synthetic network; unitful reduced electrophysiology, not a reconstructed cortical preparation.",
    reference: "neuronal-dynamics",
  },
  [ENTITY_KIND.NEURON_INHIBITORY]: {
    name: "Inhibitory neuron",
    short: "Inhibitory neuron",
    scientificName: "Reduced leaky integrate-and-fire agent",
    values: [
      ["Membrane voltage", 6, "mV"],
      ["Calcium indicator", 7, "proxy"],
      ["Exc. conductance", 8, "nS"],
      ["Inh. conductance", 9, "nS"],
    ],
    note: "Inhibition uses a negative reversal potential and positive conductance; output connections are rendered rose.",
    reference: "neuronal-dynamics",
  },
});

export const CULTURE_RULES = [
  {
    symbol: "∇²",
    title: "Diffusion + decay",
    description: "Glucose and a generic cue evolve on a 64 × 42 no-flux finite-difference grid.",
    evidence: "canonical law",
  },
  {
    symbol: "μ",
    title: "Uptake, growth, division",
    description: "Bacterial biomass follows Monod saturation and consumes glucose through an explicit yield.",
    evidence: "adapted",
  },
  {
    symbol: "↝",
    title: "Temporal chemotaxis",
    description: "Runs are extended when recent sensed glucose improves relative to the slower memory.",
    evidence: "coarse-grained",
  },
  {
    symbol: "⌁",
    title: "Noisy cue following",
    description: "Phagocytes turn probabilistically toward local cue gradients instead of deterministic homing.",
    evidence: "reduced-order",
  },
  {
    symbol: "◌",
    title: "Finite engulfment",
    description: "Contact begins a 15 s cup-progress state; collision alone cannot delete a bacterium.",
    evidence: "adapted",
  },
  {
    symbol: "!",
    title: "Host stress proxy",
    description: "Local bacterial burden drives a bounded phenomenological state with slow recovery.",
    evidence: "illustrative",
  },
];

export const NEURAL_RULES = [
  {
    symbol: "V",
    title: "Leaky integrate-and-fire",
    description: "Voltage evolves at 1 ms with pA, pF, nS, and mV units plus threshold, reset, and refractory state.",
    evidence: "canonical reduction",
  },
  {
    symbol: "g",
    title: "Conductance synapses",
    description: "Signed connections schedule delayed excitatory or inhibitory conductance events.",
    evidence: "adapted",
  },
  {
    symbol: "Ca",
    title: "Indicator proxy",
    description: "Spikes increment a separate calcium-indicator state that decays more slowly than voltage.",
    evidence: "qualitative",
  },
  {
    symbol: "∅",
    title: "Isolated chassis",
    description: "Culture entities and fields have no interaction model in the neural preset.",
    evidence: "explicit non-interaction",
  },
];

