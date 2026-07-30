# BiologicalSetup

**A composable virtual biological slide powered by Rust and WebAssembly.**

BiologicalSetup is a browser laboratory where people place a deliberately
bounded set of cells, microbes, and environmental sources on a virtual slide,
then observe and measure the resulting state. The cortical network remains
available as a separate reduced-order preset.

The site at [biologicalsetup.com](https://biologicalsetup.com/) is deployed from
`main` by GitHub Pages after a successful workflow. Public availability and the
currently served revision are external state and should be checked live rather
than inferred from this repository.

## What the rebuild contains

- a compact, dependency-free Rust simulation engine compiled to WebAssembly;
- a 400 µm × 260 µm culture slide with an explicit 20 µm effective depth;
- two no-flux extracellular fields: glucose in mM and a generic cue in
  nM-equivalent display units;
- *E. coli*-like run–tumble bacteria with Monod-limited uptake, biomass growth,
  and division;
- noisy cue-following phagocytes with finite contact and cup progress before
  engulfment;
- stationary epithelial-like cells with an explicitly phenomenological stress
  proxy;
- a separate 40-neuron excitatory/inhibitory leaky integrate-and-fire preset
  with delayed conductance synapses and a calcium-indicator proxy;
- blank culture, host–microbe, pursuit, and cortical presets;
- drag/drop, tap-to-place, keyboard placement, inspect, erase, stimulate,
  pause, step, reset, rate, seed, and share-recipe controls;
- phase-like, state-label, and chemistry observations over one engine state;
- population readouts, a trace chart, entity inspection, and an event ledger;
- a filterable [references page](./references.html) mapping every mechanism to
  primary sources, parameter provenance, validity limits, and nonclaims.

Unsupported entity/model combinations are rejected explicitly. The simulator
does not invent cross-chassis biology.

## Scientific boundary

This is a reduced-order educational model. It is not calibrated to a culture,
strain, tissue, animal, patient, microscope, treatment, or clinical outcome.
The main scientific and interface contracts are:

- [Vision](./VISION.md)
- [Biological model contract](./BIOLOGICAL_MODEL_CONTRACT.md)
- [Interface contract](./INTERFACE_CONTRACT.md)
- [Claims and validation](./CLAIMS_AND_VALIDATION.md)
- [Acceptance tests](./ACCEPTANCE_TESTS.md)
- [Scientific references](./docs/SCIENTIFIC_REFERENCES.md)

The evidence page distinguishes canonical laws, adapted mechanisms,
coarse-grained rules, illustrative parameters, and explicit omissions. A
citation supports its mapped component; it does not validate the entire
simulator.

## Architecture

```text
browser actions
      ↓
thin JavaScript ABI
      ↓
Rust / WebAssembly engine
  ├─ structure-of-arrays entities
  ├─ deterministic seeded stream
  ├─ bounded uniform spatial bins
  ├─ multirate culture / neural stepping
  ├─ scalar reaction–diffusion fields
  └─ flat typed-array snapshots
      ↓
WebGL2 observation renderer + DOM measurements
```

The interface calls WebAssembly in coarse batches and reads flat typed arrays
from linear memory. Entity rendering is a single instanced WebGL draw, field
rendering is a 64 × 42 texture, and the canvas backing store is capped at
1920 × 1080 pixels. Shared-memory WebAssembly threads are intentionally not a
baseline requirement because the current workloads are already well within a
single-thread budget and GitHub Pages does not provide the isolation headers
threads require.

## Development

Requirements:

- Node.js 24;
- Rust 1.97.1;
- the `wasm32-unknown-unknown` Rust target.

```sh
npm install
npm run dev
```

Build the Rust engine and static site:

```sh
npm run build
```

Run the complete verification suite:

```sh
npm run verify
```

Run the non-gating local profiling scenarios:

```sh
npm run benchmark
```

The benchmark reports default host–microbe stepping, a 2,000-agent culture,
the cortical preset, and isolated snapshot preparation plus JavaScript copying.
Wall-time results vary by runtime and device; the script has no release
threshold.

The GitHub Pages workflow builds the WebAssembly module from source, runs the
native, ABI, interface, and reference tests, then publishes `dist/` only from
`main`.

## Reproducibility

Within model ABI 1, the same seed, preset, ordered actions, and requested
simulated duration reproduce the same engine state. A shared recipe link
restarts the preset and view configuration; it does not pretend to serialize an
arbitrary evolved experiment.

## Preserved prototype

`prototype/` is the immutable source snapshot associated with public release
`20260726T002235Z-478235af2650`. It remains reference-only and is not imported
by the successor.

## Setup Universe

[PicSetup](https://github.com/bertona88/picsetup) ·
[ElectricalSetup](https://github.com/bertona88/electricalsetup) ·
[GravitySetup](https://github.com/bertona88/gravitysetup) ·
[TwoPhotonLithography](https://github.com/bertona88/twophotonlithography) ·
[EgoSetup](https://github.com/bertona88/egosetup) ·
[QuantumSetup](https://github.com/bertona88/quantumsetup) ·
[NoeticSetup](https://github.com/bertona88/noeticsetup) ·
[ComputationSetup](https://github.com/bertona88/computationsetup) ·
[LogisticSetup](https://github.com/bertona88/logisticsetup) ·
[MolecularSetup](https://github.com/bertona88/molecularsetup)

OpticalSetup remains in
[LucaGenchi/optics-sketch](https://github.com/LucaGenchi/optics-sketch).

## License

No open-source license has been selected.
