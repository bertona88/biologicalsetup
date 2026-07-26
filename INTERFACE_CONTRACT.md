# Interface contract

## Purpose

This document separates the living specimen, perturbation tools and observation instruments. It prevents future implementations from coupling biology to UI pixels or to another Setup repository's private state.

## Runtime layers

### 1. Biological world

Owns entities, geometry, fields, time, events and causal biological state.

### 2. Perturbation tools

Submit explicit actions to the biological world. A tool cannot directly alter rendered pixels.

### 3. Observation instruments

Read biological state and geometry to generate an image. An observation instrument cannot change biological state merely because the user switches modality.

### 4. Canvas interface

Maps pointer, touch, keyboard and compact controls onto tools, view state and selection. It does not own the source-of-truth cell state.

## Current browser view state

Shareable state currently contains only reproducible specimen identity and view configuration:

```json
{
  "version": 1,
  "specimen": "rat-cortical-patch-v2",
  "seed": 539363110,
  "view": {
    "modality": "phase",
    "focusUm": 20,
    "exposure": 1,
    "polarizationDegrees": 28,
    "srsBand": "composite"
  }
}
```

The URL does not currently serialize every neuron and pending event. This keeps links bounded and restarts a deterministic specimen rather than pretending to preserve an exact experimental recording.

## Tool action shape

Future tools should converge on a versioned action envelope:

```json
{
  "schemaVersion": 1,
  "actionType": "mechanical-poke",
  "specimenId": "rat-cortical-patch-v2",
  "timeSeconds": 12.4,
  "position": {
    "frame": "specimen-local",
    "xUm": 86.2,
    "yUm": 104.8,
    "zUm": 20
  },
  "parameters": {
    "strength": 1
  },
  "provenance": {
    "source": "pointer",
    "qualitative": true
  }
}
```

Every future action must declare units or an explicit dimensionless convention.

## Biological entity shape

A future general entity interface should provide:

```text
identity
entity type and subtype
owner module
geometry and coordinate frame
state schema version
observable channels
accepted perturbations
valid timebase
units
uncertainty / qualitative flags
provenance
```

The current neuron object is an implementation object, not yet the stable cross-preset entity schema.

## Observation interface

Each modality should declare:

```text
modality identifier
required biological channels
required preparation or label assumptions
spatial sampling
focus / depth behaviour
exposure model
noise model
output units or normalized convention
known nonclaims
```

Current modalities consume the same neuron geometry and state but use different mappings:

- `phase`: morphology and depth;
- `calcium`: indicator state and morphology;
- `shg`: membrane geometry, orientation, polarization and reduced voltage modulation;
- `srs`: reduced lipid/protein composition and morphology.

## Direct manipulation

The default interaction is a poke. Pointer coordinates are transformed into specimen-local micrometres before hit testing. The model chooses the affected biological entity. The renderer only visualizes the result.

Scrolling changes focal depth. Modified scrolling may change optical zoom. Neither changes tissue state.

## Selection and readouts

Selection is a view concern. The selected neuron card may read membrane voltage, calcium category and metabolic reserve, but selection cannot pause, stimulate or otherwise modify the neuron.

## Cross-Setup boundary

No cross-Setup API is implemented in this version.

Future connections may include:

- OpticalSetup or an optical engine providing illumination and collection geometry;
- ElectricalSetup providing electrode stimulation waveforms;
- MolecularSetup providing material or molecular payload descriptions;
- ComputationSetup receiving recorded image sequences or event traces.

Such coupling must use explicit versioned payloads with units, coordinate frames, clocks, uncertainty, provenance and source-of-truth ownership. Source code, undocumented globals and private internal state must not be copied between repositories as an integration mechanism.
