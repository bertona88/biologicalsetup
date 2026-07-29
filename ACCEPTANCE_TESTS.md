# Acceptance tests

## Build

The accepted build:

- compiles the Rust crate for `wasm32-unknown-unknown`;
- produces a bounded WebAssembly artifact;
- builds a static multi-page site suitable for GitHub Pages;
- serves the simulator and references page without external runtime
  dependencies;
- leaves the immutable `prototype/` snapshot unchanged.

## First viewport

- The virtual slide is the dominant surface.
- Entity tray, preset switcher, time controls, observation modes, measurements,
  and model-status label are visible without obscuring the slide.
- The model is labelled reduced-order in the first viewport.
- A first-time visitor can place an entity without reading documentation.
- The interface remains usable at 390 × 844 CSS pixels.

## Composition

- Blank slide starts empty except for baseline fields.
- Clicking or dragging a tray item onto the slide places the declared entity or
  field source.
- Unsupported entity/model combinations produce a visible inert/unsupported
  result.
- Erase, reset, inspect, pause, and seed controls work with pointer, keyboard,
  and touch-equivalent input.
- The cortical microcircuit is available as a preset.

## Host–microbe causality

- A glucose drop increases only the glucose field.
- A chemoattractant drop increases only the chemoattractant field.
- Bacteria consume local glucose.
- Bacterial biomass cannot increase without positive local substrate.
- Division conserves parent-plus-child biomass within tolerance.
- Phagocytes move up a static chemoattractant gradient on average.
- Engulfment requires spatial contact and available cargo capacity.
- Host stress is a bounded proxy and is never labelled viability or toxicity.

## Neural causality

- The preset contains explicit excitatory and inhibitory neurons.
- A deliberate local stimulus can produce a spike in a contacted,
  non-refractory neuron.
- Calcium indicator response follows a spike and decays more slowly.
- Synaptic events have declared sign and delay.
- Neural entities do not interact with host–microbe entities.

## Observation

- Phase, fluorescence, and chemistry views read the same engine state.
- Changing a view does not advance, reset, or mutate the engine.
- Chemistry view distinguishes glucose from chemoattractant without relying on
  colour alone.
- Selected-entity values show names, units, and proxy/qualitative labels.
- Population plots use engine metrics rather than visual sampling.

## Reproducibility and safety

- Same seed, preset, actions, and simulated duration produce identical
  snapshots.
- Exported values remain finite.
- Fields remain non-negative.
- Entity and event capacity failures are explicit.
- Catch-up work per animation frame is bounded.
- Canvas backing pixels are bounded and resizing is event-driven.
- Simulation pauses while the page is hidden.
- Reduced-motion preference removes decorative animation.

## References

- Every implemented biological or physical rule is represented on the
  references page.
- Every reference identifies the model component it informs.
- Primary sources are linked with DOI or stable publisher/repository URL.
- Each component states whether its parameters are sourced, adapted, or chosen
  for the pedagogical reduced-order model.
- The page contains the governing equations, variable units, validity limits,
  and prohibited interpretations.

