# AGENTS.md

## Repository status

This repository contains the greenfield V2 implementation of BiologicalSetup. The previous shared Setup Universe prototype is obsolete and should remain available through Git history rather than as the product architecture.

The current accepted direction is a canvas-first living specimen workbench. Read the repository contracts before changing behaviour.

## Core product laws

- The specimen is the product. Do not surround it with permanent dashboard rails.
- BiologicalSetup models sets of interacting biological entities, not one decorative cell.
- One biological source of truth feeds multiple observation instruments.
- Tools change biological or physical state; they never paint pixels directly.
- A modality switch changes observation state, not biological state.
- The specimen must be autonomously alive on first paint.
- Fine procedural motion is allowed only when it is state-aware and honestly documented.
- Curated end-to-end specimens take priority over broad empty editors.

## First vertical slice

The rat cortical patch is the first acceptance boundary:

- 200 × 200 × 40 µm;
- fifty explicit reduced-order neurons;
- sparse recurrent activity;
- direct poke interaction;
- phase, calcium, SHG and SRS observation modes;
- minimal contextual UI.

Do not add a new preset by weakening or bypassing the model/observation separation.

## Architecture

- `src/model.js` owns biological state and time stepping.
- `src/morphology.js` owns deterministic geometry and subcellular paths.
- `src/renderer.js` reads model state and produces modality-specific images.
- `src/app.js` maps input to explicit model actions and manages view state.

Keep model modules DOM-free so they remain unit-testable.

## Scientific discipline

- State coordinate systems, units, signs, timebases and normalized conventions.
- Prefer primary scientific references.
- Declare preparation and label assumptions for every microscopy mode.
- Distinguish model state, procedural visual support and acquisition artifacts.
- Do not convert normalized values into physical units without calibration.
- Never imply clinical, therapeutic, toxicity or patient-specific validity.
- Keep the exact omission list current when scope changes.

## Testing

Run `npm run verify` before committing.

Tests should cover:

- determinism;
- numerical bounds;
- biological causality;
- observation separation;
- adversarial or repeated interactions;
- first-paint interface constraints.

Browser visual review and performance profiling are separate from model tests.

## Working agreement

- Preserve unrelated user work.
- Keep changes scoped to this repository unless cross-repository work is explicitly requested.
- Do not deploy, alter DNS or modify another Setup repository incidentally.
- Do not reintroduce the old shared-runtime architecture.
- Prefer a small credible living experiment over a large mock interface.
