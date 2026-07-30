# Scientific references

The interactive references page is the canonical model-evidence interface:
[`references.html`](../references.html). Its structured source catalog is
maintained in [`src/references-data.js`](../src/references-data.js).

Each record states:

- the primary source and DOI or stable manuscript URL;
- the exact mechanism or equation it constrains;
- the corresponding BiologicalSetup implementation;
- which parameter values are sourced, adapted, or illustrative;
- the validity boundary and explicit nonclaims;
- the executable model row to which it maps.

## Current evidence map

| Model component | Governing idea | Primary evidence | Local status |
|---|---|---|---|
| Extracellular fields | `∂c/∂t = D∇²c + q − kc` | Fick (1855); Lander, Nie & Wan (2002) | Canonical equation; illustrative coefficients |
| Bacterial growth | `µ = µmax S/(Ks + S)` | Monod (1949); Pirt (1965) | Adapted Monod form; maintenance omitted |
| Run–tumble chemotaxis | Temporal comparison changes tumble hazard | Berg & Brown (1972); Segall, Block & Berg (1986) | Two-filter coarse-graining |
| Phagocyte movement | Persistent noisy chemotactic bias | Tranquillo, Lauffenburger & Zigmond (1988) | Reduced-order generic cue |
| Engulfment | Contact, cup formation, completion | Griffin et al. (1975); Tollis et al. (2010) | Finite progress; no receptor/energy model |
| Host stress | Input opposed by adaptation/recovery | Zhang & Andersen (2007) | Project-defined qualitative proxy |
| Neural voltage | Unitful leaky integrate-and-fire | Brunel & van Rossum (2007) | Canonical reduction; illustrative network |
| Neural synapses | Conductance and reversal potential | Destexhe, Mainen & Sejnowski (1994) | Exponential event-kernel reduction |
| Calcium label | Probe-mediated state with distinct kinetics | Nakai, Ohkura & Imoto (2001); Zhang et al. (2023) | Qualitative indicator proxy |
| Phase-like view | Optical path converted through interference | Zernike (1942) | Constraint only; no wave-optical solver |
| Detector model | PSF, Poisson photons, read noise | Mortensen et al. (2010) | Explicitly omitted in ABI 1 |
| Seeded randomness | Scrambled xorshift generator | Vigna (2016) | Engineering implementation |
| Local neighbours | Regular spatial partitioning | Teschner et al. (2003) | Bounded counting-grid adaptation |

The presence of a citation supports the mapped mechanism or constraint. It does
not calibrate or validate the complete simulator.

