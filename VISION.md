# BiologicalSetup vision

## Product sentence

**BiologicalSetup is a browser-based living specimen workbench. People compose biological entities, perturb their shared environment, and observe the same evolving system through multiple virtual microscopes.**

The product is not a dashboard wrapped around an animation. It is a biological world that happens to be visible through an instrument.

## The central idea

A cell is one reusable entity, not the whole product. BiologicalSetup is about **sets of cells and other biological entities occupying the same place**:

- neurons and glia in tissue;
- epithelial cells, bacteria and immune cells at a gut boundary;
- tumour cells, vessels, oxygen gradients and immune surveillance;
- a wound edge with migrating and dividing cells;
- bacteria attaching, dividing and constructing a biofilm.

Curated specimens make these systems immediately playable. A freeform canvas can later let people place entities and define an environment themselves.

Every specimen has one underlying biological state. Imaging modalities are observation models over that state. Switching microscopes must never directly repaint the world or change the biology.

> The user does not paint fluorescence. The user changes biology, and fluorescence follows.

## The first ten seconds

The page opens directly into a moving microscope field. There is no landing page and no explanatory sidebar.

The user sees irregular tissue, somata at different focal depths, neurites entering and leaving the field, subtle organelle transport, optical noise and occasional spontaneous activity. The image should initially feel close enough to a real live-cell recording that the user inspects it rather than immediately classifying it as an interface.

A small prompt says: **Poke a soma.**

The user presses a neuron. The membrane deforms. The cell fires. A calcium transient follows. Connected cells may respond. Switching from phase contrast to calcium, SHG or SRS reveals different evidence of the same event.

That causal sequence is the identity of BiologicalSetup.

## Long-term canvas

The full product has four families of objects.

### Biological entities

Cells, bacteria, neurons, immune cells, vessels, extracellular matrix, tissue boundaries, secreted particles and environmental fields.

### Biological processes

Electrical activity, diffusion, receptor signalling, adhesion, migration, growth, division, metabolism, stress, damage, death and collective behaviour.

### Perturbation instruments

Mechanical probes, pipettes, electrodes, illumination, temperature, drugs, nutrients, toxins, flow and boundary-condition changes.

### Observation instruments

Transmitted light, calcium fluorescence, voltage imaging, structural fluorescence, SHG, SRS, metabolic autofluorescence and future cross-setup optical instruments.

A tool modifies biological or physical state. A microscope reads biological and physical state. Neither is allowed to modify pixels as a shortcut.

## First accepted vertical slice

### Rat cortical microcircuit

The first specimen is a qualitative rat cortical tissue patch:

- 200 µm × 200 µm lateral extent;
- 40 µm simulated optical depth;
- 50 explicit reduced-order neurons;
- 40 excitatory and 10 inhibitory identities;
- deterministic heterogeneous morphologies and connections;
- dense lower-detail neuropil and background nuclei;
- membrane potential, calcium indicator, metabolism, stress and subcellular traffic;
- spontaneous sparse activity and local recurrent responses;
- direct mechanical/current poking;
- phase, calcium, SHG and SRS observation modes.

The fifty neurons are the **explicit model population**, not a claim that the simulated volume contains only fifty biological cells.

## What must always be moving

The scene should not wait for the user to become alive. Motion operates on multiple timescales.

### Fast

Spikes, synaptic events, calcium rises, vesicle motion, detector noise and local membrane deformation.

### Medium

Calcium clearance, adaptation, mitochondrial redistribution, metabolic recovery, photobleaching and cellular stress.

### Slow

Migration, neurite growth, synaptic remodelling, immune recruitment, cell division and tissue damage. These belong to later presets and accelerated time modes.

Some fine-scale movement can be procedural, but it must be conditioned by biological state. Low metabolism should slow active transport. Repeated stimulation should change calcium and energy demand. Damage should alter compartment integrity rather than merely adding a red tint.

## Observation doctrine

Each modality has a declared biological source, acquisition model and validity boundary.

### Phase contrast

Shows morphology, optical-path differences, focal depth and tissue motion. It is the default mode because it reads as a living specimen rather than a labelled diagram.

### Calcium fluorescence

Shows an indicator response derived from intracellular calcium with separate rise and decay kinetics. It is not a direct voltage trace and should visibly lag and outlast an electrical event.

### SHG

The first SHG configuration represents a membrane-bound, polarization-sensitive contrast mechanism with a reduced voltage dependence. It is not a generic claim that unlabelled neuronal tissue produces the displayed signal.

### SRS

Shows reduced chemical contrast based on lipid-rich and protein-rich structures. It is structurally and chemically informative, not a fast neuronal activity indicator.

Observation assumptions must remain visible in the specimen documentation even when the default canvas is almost text-free.

## Interaction doctrine

The primary interface is direct manipulation.

- Click or touch a cell to perturb it.
- Drag through tissue to apply a continuing local perturbation.
- Scroll through focal depth.
- Switch observation modality without resetting state.
- Select a cell to reveal a compact local readout.
- Open detailed controls only when needed.

Permanent side rails, parameter walls and explanatory card grids are prohibited on first paint. Analytical views may exist, but they are summoned from the specimen rather than surrounding it.

## Realism stack

BiologicalSetup pursues perceptual credibility through causality, heterogeneity and imaging constraints rather than texture alone.

1. **Model-driven state** controls the events that matter.
2. **Morphology-aware mechanics** place processes inside cells, neurites and tissue.
3. **State-aware procedural detail** supplies subcellular density and motion.
4. **Observation models** transform state into modality-specific signals.
5. **Acquisition artifacts** add depth blur, shot noise, uneven illumination and scan behaviour.

The product may be visually convincing while remaining a reduced-order model. It must never imply calibration it does not have.

## Curated specimen roadmap

### 01 — Rat cortical microcircuit

How does local stimulation spread through a heterogeneous neural population, and what does each microscope reveal?

### 02 — Gut frontier

An epithelial boundary, mucus, commensal bacteria, an invading strain and recruited white cells. What separates tolerance from an immune response?

### 03 — Neutrophil pursuit

Damaged cells release signals while immune cells navigate a chemotactic landscape. How does local damage recruit mobile responders?

### 04 — Wound closure

An epithelial sheet migrates, signals and divides across a gap. How does repair emerge from many cells?

### 05 — Biofilm

Bacteria attach, divide, consume nutrients and secrete matrix. How does spatial organization create collective protection?

### 06 — Tumour microenvironment

Heterogeneous cells, vessels, oxygen, metabolites and immune surveillance. How does location produce different cell states?

## Product principles

1. Canvas before controls.
2. Sets of interacting biological entities, not isolated diagrams.
3. One biological state, multiple observation models.
4. Direct manipulation before parameter entry.
5. Continuous autonomous life on first paint.
6. Curated specimens before an unconstrained sandbox.
7. Biological causality beneath every meaningful visual response.
8. State-aware procedural detail is allowed and labelled.
9. Units, assumptions, validity domains and nonclaims are explicit.
10. Scientific credibility and visual ambition reinforce one another.

## Non-goals

BiologicalSetup is not currently:

- a clinical, diagnostic or therapeutic system;
- a patient-specific simulator;
- a calibrated predictor of slice physiology;
- a molecularly complete neuron model;
- a replacement for electrophysiology or microscopy analysis software;
- a universal tissue simulator;
- a dashboard for displaying arbitrary biological charts.

## Success

The first version succeeds when a technically literate visitor can infer, through play, that:

- the tissue is alive before they touch it;
- a poke changes hidden biological state;
- activity can propagate between cells;
- calcium and voltage are not the same signal;
- different microscopes reveal different aspects of one event;
- structural and chemical modalities need not display a fast firing event;
- the canvas feels like a specimen, not an AI-generated control panel.
