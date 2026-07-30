# Claims and validation

## Claim gate

BiologicalSetup version 1 is a reduced-order interactive scientific model. It
may claim properties of its own equations, algorithms, action handling, and
rendered observations. It may not make clinical, diagnostic, therapeutic,
toxicity, culture-protocol, patient-specific, or experimentally calibrated
predictions.

## Implementation claims

Subject to the evidence boundaries below, the implementation may claim that it:

- runs its numerical simulation in a Rust WebAssembly module;
- evolves two extracellular scalar fields with explicit no-flux diffusion,
  source, sink, and decay terms;
- uses a Monod saturation term for bacterial growth;
- represents biased run-and-tumble motion using recent sensed concentration;
- represents phagocyte movement using a local chemoattractant gradient;
- represents finite-progress engulfment with bounded, digested cargo;
- supports deterministic presets and ordered perturbation calls, while not
  storing a complete action ledger in version 1;
- derives observation modes and measurements from one engine state;
- contains a separate reduced leaky integrate-and-fire neural preset;
- uses a uniform spatial hash for local neighbour searches;
- enforces declared entity, timestep, event-queue, and rendering limits.

These are descriptions of the implemented model. They are not claims of
biological calibration or evidence that every release criterion has passed.

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

## Current automated evidence

### Native Rust model fixtures

The native suite exercises:

- deterministic random-number sequences and same-seed world evolution;
- configured entity capacity and non-reused ids;
- no-flux diffusion mass conservation, cue decay and non-negativity, and one
  temporal-refinement comparison;
- substrate-dependent bacterial growth, crowded-cell glucose/biomass
  accounting, field-transport/entity-rule ordering, division biomass
  conservation, and bounded behaviour when entity capacity prevents division;
- finite-progress engulfment, cargo digestion, and reuse of released cargo
  capacity;
- culture/neural model incompatibility and field-channel isolation;
- neural refractory behaviour, signed delayed synaptic delivery, and bounded,
  expiring event queues;
- state hashes that include the clock, fixed-step accumulator, random generator,
  latent entity state, pending field sources, connections, and queued events.

These fixtures verify selected invariants and adversarial cases. They do not
establish that every possible exported value is finite, prove spatial
convergence, or validate the biological parameter set.

### Node-hosted WebAssembly fixtures

`tests/wasm.test.mjs` instantiates the compiled module directly in Node.js. It
checks:

- the declared coarse ABI exports;
- equality of deep-copied entities, metrics, both fields, and connections after
  the same seed and ordered perturbation sequence, plus a reordered-sequence
  control;
- channel-isolated glucose and cue placement;
- glucose depletion with increased total bacterial biomass;
- finite engulfment progress followed by removal and cargo increment;
- paired, same-seed phagocyte displacement with and without a static cue;
- explicit rejection of neural entities by the culture chassis;
- target depolarization before spike-linked indicator rise in a stimulated
  neural fixture;
- non-mutating snapshot and field reads.

These are WebAssembly ABI and causal fixtures, not browser tests. They do not
execute the DOM, WebGL shaders, pointer events, keyboard focus, responsive
layout, or a Chromium runtime.

### Source, interface, and reference checks

The Node interface suite checks selected pure helpers and source-level
contracts: recipe parsing and serialization, shortcut filtering, responsive
scale conversion, chemistry pattern/legend presence, compact model-status
labelling, incompatible-tool handling, advance-warning plumbing, hash-word
conversion, required controls, and declared model-boundary text.

The reference suite checks catalog shape, unique keys, HTTPS URL syntax, domain
labels, anchor integrity, and claim-gate presence. It does not establish that a
source is primary, validate the scientific interpretation of a source, prove
that every implemented rule is represented, or review parameter provenance.

### Build and HTTP smoke checks

`npm run verify` runs the native Rust suite, rebuilds and tests the WebAssembly
module, runs the source/interface/reference checks, builds the static pages, and
uses HTTP requests against a local Vite server to confirm that the lab,
references page, and WebAssembly asset are served with expected content types.

The HTTP smoke check does not render either page and is not a browser-layout
test.

## Numerical-verification boundary

The field suite checks no-flux mass accounting and includes one temporal
self-refinement fixture at fixed spatial resolution. No spatial-refinement
study, analytic-solution error study, or experimental parameter validation is
currently automated. The existing fixtures are solver-consistency evidence,
not validation of the biological parameter set.

## Reproducibility boundary

For one retained seed, preset, ordered ABI call sequence, and requested step
sequence, the automated suite compares all arrays exported to the browser. A
different action ordering is required to produce a different result in the
control fixture. Hash words are reconstructed as unsigned 32-bit values before
forming the 64-bit state hash.

Version 1 does not export a machine-readable action ledger or an arbitrary
evolved snapshot. Reproducing an evolved experiment therefore requires the
caller to retain and replay the ordered ABI calls and step requests.

## Performance evidence

`npm run benchmark` reports four local Node-hosted profiling scenarios:

- default host–microbe preset stepping;
- 2,000 motile bacteria plus both 64 × 42 fields;
- the 40-neuron cortical preset;
- isolated preparation and JavaScript copying of a 2,000-agent snapshot.

The output reports the runtime and explicitly marks itself non-gating. There are
no pass/fail thresholds, stored baselines, browser-device guarantees, or
performance assertions in the verification suite. Timestep catch-up and canvas
backing-pixel limits are implemented, but their limits are not exercised by
dedicated automated workload or device tests.

## Manual and currently unverified acceptance work

Real-browser QA remains manual. Before public acceptance, current Chromium and
a 390 × 844 CSS-pixel viewport must be exercised for placement, selection,
pause/reset, preset and observation switching, measurements, keyboard focus,
pointer/touch-equivalent input, visibility pausing, reduced motion, WebGL
rendering, and resizing. No current automated test makes that claim.

Scientific acceptance also remains manual. A domain reviewer must examine the
equations, units, parameter-status labels, references, visual labels,
limitations, and prohibited interpretations. Catalog schema tests are not a
substitute for that review.

## Public acceptance boundary

Passing automated tests establishes selected implementation consistency only.
The release criteria are listed in `ACCEPTANCE_TESTS.md`; their presence does
not assert that they have all passed. Public scientific acceptance additionally
requires the manual browser and domain-review evidence described above.
