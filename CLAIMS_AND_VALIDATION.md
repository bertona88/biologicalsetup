# Claims and validation

## Claim gate

BiologicalSetup version 1 is a reduced-order interactive scientific model. It
may claim properties of its own equations, algorithms, action history, and
rendered observations. It may not make clinical, diagnostic, therapeutic,
toxicity, culture-protocol, patient-specific, or experimentally calibrated
predictions.

## Allowed claims

The implementation may claim that it:

- runs its numerical simulation in a Rust WebAssembly module;
- evolves two extracellular scalar fields with explicit no-flux diffusion,
  source, sink, and decay terms;
- uses a Monod saturation term for bacterial growth;
- represents biased run-and-tumble motion using recent sensed concentration;
- represents phagocyte movement using a local chemoattractant gradient;
- records short-range engulfment events and bounded cargo;
- supports deterministic presets and ordered user perturbations;
- derives all observation modes and measurements from one engine state;
- contains a separate reduced leaky integrate-and-fire neural preset;
- uses a uniform spatial hash to bound local neighbor searches;
- enforces declared entity, timestep, and rendering budgets.

## Prohibited claims

The implementation must not claim that it predicts:

- real microbial growth curves, culture yield, infection course, or
  pathogenicity;
- named chemokine concentrations or neutrophil recruitment efficiency;
- epithelial viability, inflammation, toxicity, or barrier failure;
- treatment, antibiotic, immune, animal, or patient outcomes;
- a real cortical preparation, connectivity distribution, firing rate, or
  calcium concentration;
- camera images from a specified microscope;
- quantitative fluorescence, phase, spectral, or photon statistics;
- correctness outside the displayed parameter and model validity boundaries.

## Validation layers

### Model fixtures

Native Rust tests verify deterministic initialization, bounded state,
non-negative fields, field accounting, division preconditions, engulfment
preconditions, neural refractory behavior, and bounded queues.

### Numerical convergence

Diffusion fixtures compare the implemented stencil with symmetry and
mass-conservation expectations. At least one refinement comparison records how
the solution changes when the spatial or temporal step is reduced.

This is solver verification, not validation of the biological parameter set.

### Causal tests

Browser-level WebAssembly tests verify:

- adding glucose changes the glucose field;
- bacteria deplete local glucose and can increase biomass;
- adding chemoattractant biases phagocyte movement;
- a nearby phagocyte can remove a bacterium and increment its cargo;
- a neural stimulus affects a contacted neuron before its calcium indicator;
- switching observation modes leaves engine time and state unchanged.

### Reproducibility

Two instances with the same seed and action sequence must produce the same
exported snapshots after the same requested simulated duration.

### Performance

Benchmarks report simulation steps per second for:

- the default host–microbe preset;
- 2,000 motile agents plus both fields;
- the cortical preset;
- snapshot export.

Performance budgets are regression signals, not universal device guarantees.
The interface caps elapsed wall-time catch-up and backing-pixel count so a slow
or hidden tab cannot create an unbounded workload.

### Visual and interaction QA

Current Chromium and a narrow mobile viewport are checked for placement,
selection, pause/reset, preset switching, observation switching, readable
measurements, keyboard operation, and canvas resizing.

### Scientific provenance

The references page maps each implemented rule to primary literature, states
what was borrowed, and distinguishes literature support from local modelling
choices. A citation supports a mechanism or method; it does not validate the
complete simulator.

## Public acceptance boundary

Passing automated tests establishes implementation consistency. Public
scientific acceptance additionally requires review of equations, parameter
units, references, visual labelling, and nonclaims by a domain expert. The
existing live prototype must not be replaced until the successor has passed
that separate review.

