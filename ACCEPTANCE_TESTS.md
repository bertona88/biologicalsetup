# Acceptance tests

## Product boundary

The accepted first slice is a canvas-first rat cortical specimen with direct stimulation and four observation modalities. A generic dashboard containing a central animation does not satisfy this boundary.

## Automated tests

Run:

```sh
npm run verify
```

The current suite checks:

- one full-screen specimen canvas and no permanent dashboard rails;
- four modality controls;
- 200 µm × 200 µm × 40 µm declared volume;
- fifty explicit neurons;
- forty excitatory and ten inhibitory identities;
- morphology and subcellular traffic on every explicit neuron;
- deterministic generation for a fixed seed;
- bounded sparse baseline activity;
- reliable firing after a deliberate poke;
- excitatory and inhibitory connection signs;
- bounded shareable view state without hidden biological state.

## Manual first-paint acceptance

At desktop and mobile sizes:

- the specimen occupies the entire viewport;
- no landing page appears;
- no permanent left or right inspector appears;
- the modality switch and tool dock remain secondary to the tissue;
- tissue is visibly heterogeneous at first paint;
- some cells and processes are out of focus;
- there is autonomous movement or activity before input;
- the scene does not look like fifty identical icons;
- text does not cover a meaningful fraction of the specimen.

## Interaction acceptance

- Clicking or touching a soma causes visible local deformation.
- A deliberate poke produces a spike in a non-refractory neuron.
- The contacted neuron becomes selected.
- The compact readout updates membrane voltage, calcium category and metabolic reserve.
- Dragging applies a continuing local perturbation without selecting unrelated distant cells.
- Scrolling changes focal depth and briefly displays the focal plane.
- Reset recreates the deterministic initial specimen.
- Space pauses and resumes time.
- Keys 1–4 select phase, calcium, SHG and SRS.
- Escape closes sheets and selection.

## Observation acceptance

### Phase

- Morphology is visible without activity glow.
- Focal depth strongly changes sharpness and contrast.
- Nuclei and organelle-like structures are subtle rather than diagram labels.

### Calcium

- Resting cells are dim.
- Stimulated cells brighten after the electrical event.
- Indicator signal decays more slowly than the spike.
- Background and shot noise differ from phase mode.

### SHG

- Signal is concentrated on membrane/process geometry.
- Rotating polarization changes which segments are bright.
- SHG does not look like green calcium fluorescence with a hue shift.

### SRS

- Lipid and protein channels emphasize different structures.
- SRS remains largely structural during a fast isolated firing event.
- The composite is visually distinct from phase and fluorescence.

## Model acceptance

For the default seed over five simulated seconds:

- activity is non-zero;
- total firing remains below the runaway threshold defined in automated tests;
- no state becomes NaN or infinite;
- metabolic reserve remains in range;
- event queues do not grow without bound.

A single normal poke must not permanently place the network into a runaway high-frequency state.

## Performance target

The target is smooth interaction on a current laptop browser at 1280 × 720 with device pixel ratio capped at 2. Performance profiling must distinguish:

- biological stepping;
- morphology rendering;
- optical noise and blur;
- layout and compositing.

A visual result is not accepted if pointer response is delayed enough to break the perceived connection between poke and firing. Performance profiling is still required on representative devices before public acceptance.

## Accessibility acceptance

- Canvas and controls have accessible names.
- All buttons are keyboard reachable.
- Focus indication is visible.
- Reduced-motion preference disables decorative CSS animation.
- Modality state is exposed with `aria-pressed`.
- The product remains understandable without relying on colour alone for control state.

## Claims acceptance

- The specimen sheet states that the model is qualitative.
- No calibrated calcium concentration is displayed.
- SHG preparation assumptions are documented.
- SRS is not described as a real spectrum.
- No clinical or treatment claim appears in the interface or repository documentation.
