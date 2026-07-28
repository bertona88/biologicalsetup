# Claims and validation

## Claim gate

BiologicalSetup is a qualitative, reduced-order interactive scientific visualization. It may make claims about its own internal causal model and interface behaviour. It may not make clinical, diagnostic, therapeutic, toxicity, patient-specific or experimentally calibrated prediction claims.

## Claims allowed for the first specimen

The implementation may claim that it:

- contains fifty explicit heterogeneous reduced-order neurons;
- distinguishes excitatory and inhibitory connection signs;
- evolves membrane voltage, calcium indicator, metabolism and stress states;
- produces sparse autonomous activity under the default deterministic seed;
- lets a user apply a local perturbation to an explicit neuron;
- propagates scheduled synaptic events through a synthetic recurrent network;
- derives four different visual observations from the same underlying state;
- separates calcium-indicator kinetics from the electrical event;
- changes SHG appearance with membrane orientation and user-selected polarization;
- changes SRS appearance according to reduced lipid/protein channels;
- represents focal depth and acquisition noise qualitatively.

## Claims prohibited

The implementation must not claim that it predicts:

- real rat slice firing rates, connectivity or response probabilities;
- a specific cortical layer, animal age, preparation or disease state;
- quantitative calcium concentration;
- electrophysiological membrane traces suitable for analysis;
- real force, current injection or patch-clamp conditions;
- quantitative SHG susceptibility, voltage sensitivity or signal-to-noise;
- quantitative Raman spectra or molecular concentrations;
- phototoxicity, tissue viability or treatment response;
- patient or animal outcomes.

## Modality-specific validity boundaries

### Phase

The phase mode is a perceptual observation model based on geometry, depth blur, halos, illumination and noise. It is not a wave-optical phase-contrast reconstruction and does not reproduce a particular objective, condenser or camera.

### Calcium

The calcium mode has a distinct reduced calcium state and indicator state. This is sufficient to demonstrate temporal separation from voltage, but it is not calibrated to a specific GCaMP variant, expression level, frame rate or photon budget.

### SHG

The SHG mode represents a defined conceptual preparation with membrane-sensitive contrast. Its dependence on membrane orientation and polarization is scientifically motivated. Its intensity law, colour and voltage modulation are deliberately reduced. It must not be presented as generic endogenous neuronal SHG.

### SRS

The SRS mode represents reduced lipid-rich and protein-rich channels. It demonstrates chemical contrast and the fact that structural chemistry need not mirror fast neural firing. It does not simulate pump/Stokes propagation, Raman line shapes, spectral unmixing, absolute concentrations or laser safety.

## Validation layers

### 1. Structural validation

Automated checks verify population count, cell identities, morphology, organelle presence, connectivity signs and deterministic generation.

### 2. Numerical validation

Automated checks verify bounded default activity, finite state, state ranges and a reliable spike response to deliberate stimulation.

### 3. Causal validation

Tests and manual inspection verify that:

- a poke affects the contacted neuron;
- the neuron fires only through model state;
- calcium follows the spike;
- outgoing events are scheduled;
- modality switches preserve biological state.

### 4. Observation validation

Manual review compares each renderer with its declared observation contract rather than with the visual style of another mode.

### 5. Perceptual validation

Reviewers should assess whether the default scene reads as living tissue rather than a network diagram. This includes heterogeneity, optical depth, partial occlusion, restrained contrast, autonomous motion and absence of dashboard framing.

### 6. Browser validation

Static serving, responsive layout, pointer/touch interaction, keyboard controls, shareable view state and current evergreen-browser behaviour are separate acceptance boundaries.

## Scientific grounding

The project uses primary literature to constrain observation concepts, while retaining explicit reduced-order status. The initial source list is maintained in [`docs/SCIENTIFIC_REFERENCES.md`](docs/SCIENTIFIC_REFERENCES.md).

The literature supports broad principles used here:

- neuronal population calcium imaging records activity-dependent fluorescence with sensor-specific kinetics;
- SHG from appropriate membrane preparations can be polarization-sensitive and voltage-sensitive;
- SRS can provide chemically selective contrast for lipids, proteins and brain tissue.

The literature does not validate the current renderer pixel-for-pixel or calibrate its numerical output.
