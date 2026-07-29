# BiologicalSetup vision

## Product sentence

**BiologicalSetup is a browser laboratory where people compose a small,
declared set of biological entities on a virtual slide, perturb their shared
environment, and measure the consequences.**

The product is not a universal simulator and it is not a microscopy
screensaver. It is an extensible workbench whose first models are deliberately
bounded, inspectable, reproducible, and linked to primary literature.

## Product shape

The main surface is a 400 µm × 260 µm two-dimensional specimen plane. A user
can:

- load a curated specimen or start with a blank slide;
- place biological entities and environmental sources directly on the slide;
- observe one evolving hidden state through phase-like, fluorescence-like, and
  chemical-field views;
- inspect entities and population measurements;
- pause, reset, change time scale, and reproduce a run from a seed;
- see the declared interaction rules and the references behind them.

The first release supports a finite entity vocabulary:

- an *E. coli*-like motile bacterium;
- a neutrophil-like phagocyte;
- a stationary epithelial-like host cell;
- extracellular glucose;
- a generic bacterial/damage chemoattractant;
- reduced-order excitatory and inhibitory neurons in a separate preset.

The vocabulary is intentionally small. An unsupported combination is inert
rather than assigned invented biology.

## First accepted end-to-end experiment

The primary scientific slice is a host–microbe slide:

1. extracellular glucose and chemoattractant evolve on a no-flux
   reaction–diffusion grid;
2. bacteria move, sense a local temporal gradient, consume glucose, grow, and
   divide;
3. phagocytes follow the chemoattractant gradient and engulf nearby bacteria;
4. epithelial-like cells accumulate a reduced stress proxy when local bacterial
   burden is high;
5. microscope views and plots read the same state without modifying it;
6. the event can be reset and reproduced from an explicit seed.

This is a reduced-order, accelerated educational experiment. It is not a
calibrated infection, immunology, culture, toxicity, or treatment model.

## Cortical preset

The cortical microcircuit is retained as an authored preset, not as the product
identity. It contains reduced leaky integrate-and-fire excitatory and inhibitory
neurons with deterministic distance-dependent connections and delayed synaptic
events.

The neural preset has a millisecond-scale solver and does not share the
host–microbe model's accelerated time scale. It demonstrates that the workbench
can host a different declared model family; it does not imply that arbitrary
cell types can interact with neurons.

## Design principles

1. Direct manipulation before parameter walls.
2. One hidden state, multiple observations.
3. Units and timebases are visible.
4. Every rule has a validity domain and a nonclaim.
5. Deterministic seeds make examples reproducible.
6. Measurements and event history matter as much as animation.
7. A Rust/WebAssembly engine owns simulation state and numerical stepping.
8. Rendering is bounded independently of model stepping.
9. Model families remain isolated until an explicit interface connects them.
10. Scientific ambition is expressed through inspectability, not overclaiming.

## Long-term direction

Future model packs may add biofilms, wound closure, compartmental calcium,
organoids, tumour microenvironments, and optical experiments. A new pack is
accepted only when it declares entities, state, units, governing rules,
parameters, numerical method, observation model, validation fixtures, and
literature provenance.

## Non-goals

BiologicalSetup is not currently:

- a clinical, diagnostic, therapeutic, or patient-specific system;
- a calibrated predictor of infection, immunity, toxicity, drug response, or
  tissue physiology;
- a molecular dynamics engine;
- a replacement for microscopy, cytometry, electrophysiology, or analysis
  software;
- a claim that all biological entities share a meaningful universal model;
- a platform where visual resemblance substitutes for numerical validation.

