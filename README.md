# BiologicalSetup

> **Preliminary Setup Universe wrapper.** The current demo is temporary; the full simulator is expected to be redesigned and rebuilt substantially from scratch.

- **Live prototype:** https://biologicalsetup.com/
- **Prototype release verified:** 2026-07-26 (`20260726T002235Z-478235af2650`); check the URL for current availability
- **Field:** Biological systems
- **Status:** Greenfield planning wrapper with a preserved prototype snapshot

## Vision

The intended BiologicalSetup product is an A multiscale biological experimentation workbench spanning cells, transport, reaction networks, microscopy observables, perturbations, and population-level behavior.

BiologicalSetup is part of the **Setup Universe**: independently deployed scientific and systems workbenches intended to become interoperable. Over time, setups should be able to orchestrate or interface with one another through explicit, versioned, unit-aware ports without transferring ownership or copying private implementation state.

**First accepted end-to-end slice:** Build one explicitly compartmentalized cell experiment with reaction–diffusion state, a controlled perturbation, and a microscopy observation model whose readouts trace back to the simulated state.

**Model boundary:** BiologicalSetup owns biological state and populations; MolecularSetup owns molecular/material dynamics; EgoSetup owns agent and institution rules; NoeticSetup owns synchronization observables.

**Claim gate:** No clinical, diagnostic, therapeutic, toxicity, or patient-specific inference is allowed; all biological validity domains and observation assumptions must be explicit.

## Important starting point

Read [AGENTS.md](./AGENTS.md) before planning or implementing work.

The present browser demo should not constrain the next architecture. Before substantial implementation, this repository expects `VISION.md`, `BIOLOGICAL_MODEL_CONTRACT.md`, `INTERFACE_CONTRACT.md`, `CLAIMS_AND_VALIDATION.md`, and `ACCEPTANCE_TESTS.md`.

## Prototype model boundary

The following describes only the current reference prototype, not the intended simulator.

**Exact current scope:** A Gray–Scott field inside a deformable cell is coupled to bounded phenomenological ODEs for ATP, calcium, caspase activity, membrane integrity, and cell-cycle phase.

**Known limits:**

- Parameters are qualitative and normalized; the model cannot predict treatment response or patient biology.
- Organelles and microscopy modes are explanatory renderings, not reconstructed microscope images.
- Reaction–diffusion chemistry and pathway ODEs omit molecular identity, stochastic gene expression, and tissue mechanics.

## Current prototype snapshot

`prototype/` preserves the exact shared browser-prototype source associated with production release `20260726T002235Z-478235af2650`. Its recorded deployed-source SHA-256 is `478235af26508aa70aa2af5f0196c9868b92ded1bed88106a9aa1a1cd86f8ba5`.

The snapshot contains all current Setup Universe demos because that release uses one shared, host-routed runtime. It is immutable, reference-only prior art: do not build the new architecture inside it. Moving, archiving, or removing it requires explicit user authorization after an accepted successor and preserved provenance.

To run the snapshot locally:

```sh
npm run prototype:test
npm run prototype:check
npm run prototype:serve
```

Then open http://127.0.0.1:4173/?setup=biological.

These commands validate only the legacy prototype. This wrapper intentionally has no future-product test suite until the greenfield implementation begins.

## Setup Universe

[PicSetup](https://github.com/bertona88/picsetup) · [ElectricalSetup](https://github.com/bertona88/electricalsetup) · [GravitySetup](https://github.com/bertona88/gravitysetup) · [TwoPhotonLithography](https://github.com/bertona88/twophotonlithography) · [EgoSetup](https://github.com/bertona88/egosetup) · [QuantumSetup](https://github.com/bertona88/quantumsetup) · [NoeticSetup](https://github.com/bertona88/noeticsetup) · [ComputationSetup](https://github.com/bertona88/computationsetup) · [LogisticSetup](https://github.com/bertona88/logisticsetup) · [MolecularSetup](https://github.com/bertona88/molecularsetup)

OpticalSetup remains in [LucaGenchi/optics-sketch](https://github.com/LucaGenchi/optics-sketch).

## License

No open-source license has been selected yet.
