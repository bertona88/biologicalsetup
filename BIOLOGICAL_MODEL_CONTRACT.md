# Biological model contract

## Status

- Model family: `slide-lab-v1`
- Schema version: `1`
- Engine: Rust compiled to WebAssembly
- Validity: reduced-order and pedagogical

This contract is authoritative for the first rebuilt simulator.

## Coordinate system, time, and boundaries

The host–microbe slide uses a two-dimensional specimen-local frame:

- `x`: 0–400 µm, increasing to the right;
- `y`: 0–260 µm, increasing downward in the interface;
- time: seconds;
- effective liquid depth: 20 µm;
- extracellular fields: sampled on a regular 64 × 42 finite-difference grid;
- entity positions and radii: micrometres;
- boundary condition: reflecting entities and zero-flux field boundaries.

The slide represents a thin effective plane, not a resolved three-dimensional
volume. Each field voxel is assigned the stated effective depth, so its volume
is `dx × dy × 20 µm`. This permits source and uptake accounting in
concentration units while remaining an effective well-mixed-depth
approximation.

The field solver uses a fixed step chosen to satisfy the documented explicit
diffusion stability limit. Entity rules are evaluated after field transport at
the same simulation time.

## Extracellular fields

### Glucose

Glucose is expressed in millimolar (mM). It diffuses and is locally consumed by
bacteria. Nutrient drops add a bounded Gaussian-like deposit to the field.

The bacterial growth rate follows a Monod saturation term:

```text
mu(S) = mu_max * S / (K_s + S)
```

The implementation is not a full carbon, energy, oxygen, or biomass balance.
The uptake coefficient is an effective 2D coupling selected for stable,
observable browser experiments.

### Chemoattractant

Chemoattractant is a generic reduced proxy in nanomolar-equivalent display
units (`nM-eq`). It diffuses, decays by first-order kinetics, and is emitted by
bacteria and stressed host cells.

`nM-eq` is not a named ligand concentration. It may not be interpreted as
fMLP, IL-8, LTB4, or another specific pathway without a future calibrated model.

## Entity rules

### Motile bacterium

The bacterium is an *E. coli*-like pedagogical agent with:

- rod-like rendered geometry;
- position, heading, speed, biomass, and prior sensed glucose;
- run-and-tumble motion;
- a tumble probability modulated by the recent change in sensed glucose;
- Monod-limited biomass growth;
- division after a deterministic, seed-dependent biomass threshold;
- local glucose uptake and generic chemoattractant emission.

The model omits flagellar mechanics, receptor methylation state, gene
expression, oxygen limitation, waste, quorum sensing, antibiotics, adhesion,
biofilm matrix, and strain-specific parameters.

### Neutrophil-like phagocyte

The phagocyte has:

- position, heading, chemotactic polarity, cargo count, and digestion state;
- biased motion up the chemoattractant gradient;
- a `search → contact → cup → engulfed` state with finite progress rather than
  collision deletion;
- finite cargo capacity and delayed digestion.

This is a navigation and encounter model. It omits receptor occupancy,
signalling networks, deformable mechanics, adhesion, transmigration,
phagosome chemistry, oxidative burst, NET formation, cytokines, and cell death.
It may not predict immune efficiency.

### Epithelial-like host cell

The host cell is stationary and has a bounded stress proxy. Stress increases
with local bacterial burden and relaxes in its absence. A sufficiently stressed
cell emits additional generic chemoattractant.

Stress is dimensionless and phenomenological. It is not viability, toxicity,
inflammation, membrane damage, or a clinical outcome.

### Environmental source

Glucose and chemoattractant drops are field perturbations rather than living
entities. Version 1 applies their channel, position, fixed placement radius, and
amount through the primitive WebAssembly ABI. The browser may show a bounded
human-readable summary, but neither the engine nor a shared recipe URL records a
complete versioned action ledger. Exact replay of an evolved experiment
therefore requires an external caller to retain the ordered ABI calls and step
requests.

## Neural model family

The `cortical-microcircuit` preset uses a separate timebase and dynamics:

```text
tau_m dV/dt = E_L - V + R_m(I_tonic + I_syn + I_external)
```

Threshold crossing resets voltage, starts a refractory interval, increments a
reduced calcium indicator, and schedules delayed signed synaptic events.
Excitatory and inhibitory identities determine event sign. Calcium indicator
state rises after spikes and decays more slowly than voltage.

The network is synthetic and qualitative. It is not a reconstructed cortical
region, a conductance-based neuron, a cable model, or a prediction of firing
rate, connectivity, pharmacology, or species-specific physiology.

Host–microbe entities do not interact with neural entities in version 1.

## Determinism and capacity

A 64-bit seed controls stochastic decisions. For the same engine version,
preset, seed, ordered action sequence, and step sequence, the world state must
be reproducible. Version 1 can execute such a retained sequence
deterministically; it does not export the sequence itself.

The first release supports up to 8,192 live entities. Entity state uses
structure-of-arrays storage, a uniform spatial hash for local queries, and
bounded event queues. Reaching a limit produces a visible failure event rather
than silently dropping state.

## Numerical invariants

- time and every exported scalar remain finite;
- concentrations remain non-negative;
- field sources and sinks are clamped to declared limits;
- live entity count never exceeds capacity;
- ids are not reused within a run;
- dead entities cannot consume, emit, divide, or be selected;
- no-flux diffusion without reactions preserves field sum within floating-point
  tolerance;
- neural event queues are bounded and expired;
- resetting a preset restores its deterministic initial state.

## Explicit omissions

The engine does not currently model fluid flow, deformable bodies, adhesion,
cell-cycle checkpoints, gene regulation, molecular reaction networks,
three-dimensional transport, volume exclusion beyond short-range steering,
photophysics, real camera noise, specimen preparation, or inter-model
biological compatibility.
