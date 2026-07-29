export const REFERENCES = [
  {
    key: "fick-1855",
    domain: "physics",
    mechanism: "Field transport",
    evidence: "canonical law",
    year: 1855,
    citation:
      "Fick A. Ueber Diffusion. Annalen der Physik 170, 59–86 (1855).",
    title: "Ueber Diffusion",
    url: "https://doi.org/10.1002/andp.18551700105",
    doi: "10.1002/andp.18551700105",
    constrains:
      "Fickian flux and conservation form for both extracellular scalar fields.",
    implementation:
      "Five-point explicit stencil, zero-flux boundaries, Dglucose = 120 µm² s⁻¹ and Dcue = 70 µm² s⁻¹ on a 64 × 42 plane.",
    parameterStatus:
      "Equation canonical; diffusion coefficients are illustrative effective values.",
    validity:
      "Two-dimensional effective-depth approximation; no advection, binding, or heterogeneous medium.",
    anchors: ["diffusion"],
  },
  {
    key: "monod-1949",
    domain: "chemistry",
    mechanism: "Nutrient-limited growth",
    evidence: "adapted",
    year: 1949,
    citation:
      "Monod J. The Growth of Bacterial Cultures. Annual Review of Microbiology 3, 371–394 (1949).",
    title: "The Growth of Bacterial Cultures",
    url: "https://doi.org/10.1146/annurev.mi.03.100149.002103",
    doi: "10.1146/annurev.mi.03.100149.002103",
    constrains:
      "Saturating substrate dependence of specific growth and substrate-to-biomass accounting.",
    implementation:
      "µ(S)=µmaxS/(Ks+S); µmax=ln2/1200 s, Ks=0.05 mM, biomass yield Y=0.5 g g⁻¹; cells divide at 0.60 pg.",
    parameterStatus:
      "Equation adapted; every numeric parameter is illustrative rather than culture-fitted.",
    validity:
      "One substrate, fixed yield, no oxygen, maintenance, waste, lag, or strain-specific physiology.",
    anchors: ["bacterial-growth"],
  },
  {
    key: "pirt-1965",
    domain: "chemistry",
    mechanism: "Maintenance metabolism boundary",
    evidence: "explicit omission",
    year: 1965,
    citation:
      "Pirt SJ. The Maintenance Energy of Bacteria in Growing Cultures. Proceedings of the Royal Society B 163, 224–231 (1965).",
    title: "The Maintenance Energy of Bacteria in Growing Cultures",
    url: "https://doi.org/10.1098/rspb.1965.0069",
    doi: "10.1098/rspb.1965.0069",
    constrains:
      "Shows why substrate use can include maintenance even without net growth.",
    implementation:
      "Maintenance is deliberately omitted from model ABI 1; starving bacteria therefore stop growing and consuming.",
    parameterStatus: "Constraint and documented omission; no Pirt parameter is fitted.",
    validity:
      "Prevents the reduced Monod implementation from being described as a complete biomass balance.",
    anchors: ["bacterial-growth"],
  },
  {
    key: "berg-brown-1972",
    domain: "biology",
    mechanism: "Bacterial run–tumble motion",
    evidence: "adapted",
    year: 1972,
    citation:
      "Berg HC, Brown DA. Chemotaxis in Escherichia coli Analysed by Three-dimensional Tracking. Nature 239, 500–504 (1972).",
    title: "Chemotaxis in Escherichia coli Analysed by Three-dimensional Tracking",
    url: "https://doi.org/10.1038/239500a0",
    doi: "10.1038/239500a0",
    constrains:
      "Constant-speed runs interrupted by stochastic reorientation; favourable history extends runs.",
    implementation:
      "Agents move at an illustrative 15 µm s⁻¹ and draw tumbles from a concentration-history-dependent hazard.",
    parameterStatus:
      "Mechanism adapted; speed and hazard limits are selected for the 2D browser specimen.",
    validity:
      "No flagellar mechanics, rotational diffusion, receptor occupancy, or three-dimensional tracking.",
    anchors: ["bacterial-chemotaxis"],
  },
  {
    key: "segall-1986",
    domain: "biology",
    mechanism: "Temporal chemotactic comparison",
    evidence: "coarse-grained",
    year: 1986,
    citation:
      "Segall JE, Block SM, Berg HC. Temporal Comparisons in Bacterial Chemotaxis. PNAS 83, 8987–8991 (1986).",
    title: "Temporal Comparisons in Bacterial Chemotaxis",
    url: "https://doi.org/10.1073/pnas.83.23.8987",
    doi: "10.1073/pnas.83.23.8987",
    constrains:
      "Wild-type bacteria compare recent attractant history with an earlier window rather than sensing only an instantaneous spatial force.",
    implementation:
      "Two first-order filters use τfast=0.8 s and τslow=4 s; their difference modulates the tumble hazard.",
    parameterStatus:
      "The two-filter equation is a project coarse-graining, not the paper’s verbatim response kernel.",
    validity:
      "Glucose is used as the attractant channel; adaptation chemistry is not represented.",
    anchors: ["bacterial-chemotaxis"],
  },
  {
    key: "tranquillo-1988",
    domain: "biology",
    mechanism: "Phagocyte chemotaxis",
    evidence: "reduced-order",
    year: 1988,
    citation:
      "Tranquillo RT, Lauffenburger DA, Zigmond SH. A Stochastic Model for Leukocyte Random Motility and Chemotaxis Based on Receptor Binding Fluctuations. Journal of Cell Biology 106, 303–309 (1988).",
    title: "A Stochastic Model for Leukocyte Random Motility and Chemotaxis",
    url: "https://doi.org/10.1083/jcb.106.2.303",
    doi: "10.1083/jcb.106.2.303",
    constrains:
      "Leukocyte movement combines persistence, stochastic turning, and gradient bias rather than perfect homing.",
    implementation:
      "A noisy angular process turns a 0.20 µm s⁻¹ agent toward the local generic-cue gradient.",
    parameterStatus:
      "Mechanistic character retained; cue identity, speed, and angular-noise constants are illustrative.",
    validity:
      "No receptor binding, polarization signalling, adhesion, deformation, or transmigration.",
    anchors: ["phagocyte-chemotaxis"],
  },
  {
    key: "griffin-1975",
    domain: "biology",
    mechanism: "Phagocytic zipper requirement",
    evidence: "conceptual constraint",
    year: 1975,
    citation:
      "Griffin FM Jr, Griffin JA, Leider JE, Silverstein SC. Studies on the Mechanism of Phagocytosis. I. Requirements for Circumferential Attachment of Particle-bound Ligands to Specific Receptors on the Macrophage Plasma Membrane. Journal of Experimental Medicine 142, 1263–1282 (1975).",
    title: "Studies on the Mechanism of Phagocytosis. I.",
    url: "https://doi.org/10.1084/jem.142.5.1263",
    doi: "10.1084/jem.142.5.1263",
    constrains:
      "Contact alone is not sufficient; engulfment progresses through continuing receptor–ligand attachment.",
    implementation:
      "Collision starts a persistent cup-progress state. The target is removed only when progress reaches one.",
    parameterStatus:
      "Conceptual state-machine constraint; receptor and ligand variables are omitted.",
    validity:
      "The agent is neutrophil-like while the source experiment used macrophages; no rate is transferred.",
    anchors: ["phagocytosis"],
  },
  {
    key: "tollis-2010",
    domain: "physics",
    mechanism: "Finite phagocytic cup",
    evidence: "adapted",
    year: 2010,
    citation:
      "Tollis S, Dart AE, Tzircotis G, Endres RG. The Zipper Mechanism in Phagocytosis: Energetic Requirements and Variability in Phagocytic Cup Shape. BMC Systems Biology 4, 149 (2010).",
    title: "The Zipper Mechanism in Phagocytosis",
    url: "https://doi.org/10.1186/1752-0509-4-149",
    doi: "10.1186/1752-0509-4-149",
    constrains:
      "Engulfment has finite progress and depends on geometry, binding, and membrane energetics.",
    implementation:
      "A 15 s illustrative progress variable e∈[0,1] replaces instantaneous collision deletion.",
    parameterStatus:
      "State topology adapted; the energetic cup-shape model and its parameters are not implemented.",
    validity:
      "Target size, curvature, ligand density, membrane tension, and actin mechanics are absent.",
    anchors: ["phagocytosis"],
  },
  {
    key: "zhang-andersen-2007",
    domain: "biology",
    mechanism: "Adaptive stress response",
    evidence: "conceptual constraint",
    year: 2007,
    citation:
      "Zhang Q, Andersen ME. Dose Response Relationship in Anti-Stress Gene Regulatory Networks. PLOS Computational Biology 3, e24 (2007).",
    title: "Dose Response Relationship in Anti-Stress Gene Regulatory Networks",
    url: "https://doi.org/10.1371/journal.pcbi.0030024",
    doi: "10.1371/journal.pcbi.0030024",
    constrains:
      "Stress responses can be nonlinear, adaptive, and opposed by repair or negative feedback.",
    implementation:
      "A project-defined bounded host stress proxy rises with local bacterial burden and relaxes on a slower timescale.",
    parameterStatus:
      "Concept only. The implemented equation and all constants are illustrative and not fitted to this paper.",
    validity:
      "Not a named pathway, epithelial cell line, barrier-integrity, viability, inflammation, or toxicity model.",
    anchors: ["epithelial-stress"],
  },
  {
    key: "lander-2002",
    domain: "chemistry",
    mechanism: "Source–diffusion–degradation field",
    evidence: "adapted",
    year: 2002,
    citation:
      "Lander AD, Nie Q, Wan FYM. Do Morphogen Gradients Arise by Diffusion? Developmental Cell 2, 785–796 (2002).",
    title: "Do Morphogen Gradients Arise by Diffusion?",
    url: "https://doi.org/10.1016/S1534-5807(02)00179-X",
    doi: "10.1016/S1534-5807(02)00179-X",
    constrains:
      "Source, diffusion, and first-order degradation establish a characteristic field lifetime and length.",
    implementation:
      "The generic cue diffuses at 70 µm² s⁻¹ and decays with an illustrative 20 s half-life.",
    parameterStatus:
      "Equation class adapted; neither the cue identity nor the numeric constants come from this morphogen system.",
    validity:
      "No receptor binding, nonlinear uptake, tissue tortuosity, flow, or named inflammatory ligand.",
    anchors: ["diffusion"],
  },
  {
    key: "brunel-rossum-2007",
    domain: "biology",
    mechanism: "Leaky integrate-and-fire neuron",
    evidence: "canonical reduction",
    year: 2007,
    citation:
      "Brunel N, van Rossum MCW. Lapicque’s 1907 Paper: From Frogs to Integrate-and-fire. Biological Cybernetics 97, 337–339 (2007).",
    title: "Lapicque’s 1907 Paper: From Frogs to Integrate-and-fire",
    url: "https://doi.org/10.1007/s00422-007-0190-0",
    doi: "10.1007/s00422-007-0190-0",
    constrains:
      "Unitful leaky integration with threshold, reset, and a declared refractory state.",
    implementation:
      "C=200 pF, EL=−65 mV, τm=20 ms, threshold=−50 mV, reset=−68 mV, 4 ms refractory, 1 ms fixed step.",
    parameterStatus:
      "Equation canonical; this heterogeneous parameter set is illustrative.",
    validity:
      "No ion channels, dendritic cable, morphology-dependent currents, real cortical layer, species, or preparation.",
    anchors: ["neuronal-dynamics"],
  },
  {
    key: "destexhe-1994",
    domain: "chemistry",
    mechanism: "Conductance synapses",
    evidence: "adapted",
    year: 1994,
    citation:
      "Destexhe A, Mainen ZF, Sejnowski TJ. An Efficient Method for Computing Synaptic Conductances Based on a Kinetic Model of Receptor Binding. Neural Computation 6, 14–18 (1994).",
    title: "An Efficient Method for Computing Synaptic Conductances",
    url: "https://doi.org/10.1162/neco.1994.6.1.14",
    doi: "10.1162/neco.1994.6.1.14",
    constrains:
      "Synaptic input is a conductance with a reversal potential and time course, not an arbitrary voltage kick.",
    implementation:
      "Delayed exponential conductances use Eexc=0 mV, Einh=−80 mV, τexc=5 ms, and τinh=10 ms.",
    parameterStatus:
      "Conductance form adapted; the full receptor-binding kinetic scheme is reduced to event kernels.",
    validity:
      "Synthetic connectivity, no receptor subtypes, release probability, short-term plasticity, or dendritic location.",
    anchors: ["neuronal-dynamics"],
  },
  {
    key: "nakai-2001",
    domain: "observation",
    mechanism: "Genetically encoded calcium indicators",
    evidence: "conceptual constraint",
    year: 2001,
    citation:
      "Nakai J, Ohkura M, Imoto K. A High Signal-to-noise Ca²⁺ Probe Composed of a Single Green Fluorescent Protein. Nature Biotechnology 19, 137–141 (2001).",
    title: "A High Signal-to-noise Ca²⁺ Probe Composed of a Single Green Fluorescent Protein",
    url: "https://doi.org/10.1038/84397",
    doi: "10.1038/84397",
    constrains:
      "Fluorescence is a probe-mediated observation of calcium, distinct from membrane voltage.",
    implementation:
      "The neural preset increments a separate indicator proxy after a spike; Labels view reads that state.",
    parameterStatus:
      "Concept only; the proxy is not calibrated to GCaMP kinetics, affinity, expression, or ΔF/F₀.",
    validity:
      "Labels view is a state visualization, not a quantitative fluorescence microscope.",
    anchors: ["calcium-indicator"],
  },
  {
    key: "zhang-2023",
    domain: "observation",
    mechanism: "Sensor-specific calcium kinetics",
    evidence: "conceptual constraint",
    year: 2023,
    citation:
      "Zhang Y et al. Fast and Sensitive GCaMP Calcium Indicators for Imaging Neural Populations. Nature 615, 884–891 (2023).",
    title: "Fast and Sensitive GCaMP Calcium Indicators for Imaging Neural Populations",
    url: "https://doi.org/10.1038/s41586-023-05828-9",
    doi: "10.1038/s41586-023-05828-9",
    constrains:
      "Indicator amplitude and time course are sensor-dependent; calcium fluorescence cannot be treated as voltage.",
    implementation:
      "The engine enforces spike-before-indicator ordering and a 450 ms qualitative decay.",
    parameterStatus:
      "Temporal separation is constrained; no parameter is fitted to a named jGCaMP8 variant.",
    validity:
      "No saturation curve, photon budget, frame integration, expression heterogeneity, or neuropil contamination.",
    anchors: ["calcium-indicator"],
  },
  {
    key: "zernike-1942",
    domain: "observation",
    mechanism: "Phase contrast boundary",
    evidence: "conceptual constraint",
    year: 1942,
    citation:
      "Zernike F. Phase Contrast, a New Method for the Microscopic Observation of Transparent Objects. Physica 9, 686–698 (1942).",
    title: "Phase Contrast, a New Method for the Microscopic Observation of Transparent Objects",
    url: "https://doi.org/10.1016/S0031-8914(42)80035-X",
    doi: "10.1016/S0031-8914(42)80035-X",
    constrains:
      "True phase contrast converts optical-path differences into intensity through interference.",
    implementation:
      "Current Phase view uses geometry-conditioned qualitative contrast and is labelled phase-like.",
    parameterStatus:
      "Scientific boundary only; no condenser annulus, phase plate, refractive index, wavelength, or PSF is simulated.",
    validity:
      "The rendered pixels must not be interpreted as a reconstructed or specified phase-contrast microscope.",
    anchors: ["phase-observation"],
  },
  {
    key: "mortensen-2010",
    domain: "observation",
    mechanism: "Photon and detector statistics boundary",
    evidence: "explicit omission",
    year: 2010,
    citation:
      "Mortensen KI, Churchman LS, Spudich JA, Flyvbjerg H. Optimized Localization-analysis for Single-molecule Tracking and Super-resolution Microscopy. Nature Methods 7, 377–381 (2010).",
    title: "Optimized Localization-analysis for Single-molecule Tracking and Super-resolution Microscopy",
    url: "https://doi.org/10.1038/nmeth.1447",
    doi: "10.1038/nmeth.1447",
    constrains:
      "A quantitative fluorescence image needs a PSF, expected photons, Poisson counts, gain, offset, and read noise.",
    implementation:
      "ABI 1 deliberately does not implement a photon detector. Labels view is a direct state view.",
    parameterStatus: "Documented omission and upgrade contract.",
    validity:
      "No quantitative intensity, localization precision, exposure, bleaching, or signal-to-noise claim.",
    anchors: ["calcium-indicator", "phase-observation"],
  },
  {
    key: "vigna-2016",
    domain: "computation",
    mechanism: "Seeded pseudorandom stream",
    evidence: "engineering method",
    year: 2016,
    citation:
      "Vigna S. An Experimental Exploration of Marsaglia’s Xorshift Generators, Scrambled. ACM Transactions on Mathematical Software 42, 30 (2016).",
    title: "An Experimental Exploration of Marsaglia’s Xorshift Generators, Scrambled",
    url: "https://doi.org/10.1145/2845077",
    doi: "10.1145/2845077",
    constrains:
      "Scrambling a xorshift state improves output behaviour while retaining a tiny deterministic state.",
    implementation:
      "The single-thread engine uses xorshift64* for all model draws; browser Math.random is never used.",
    parameterStatus:
      "Engineering implementation; future parallel execution should migrate to a counter-based generator.",
    validity:
      "Replay is guaranteed only for the same engine ABI/build, seed, ordered actions, and fixed-step sequence.",
    anchors: ["determinism"],
  },
  {
    key: "teschner-2003",
    domain: "computation",
    mechanism: "Uniform spatial bins",
    evidence: "engineering method",
    year: 2003,
    citation:
      "Teschner M et al. Optimized Spatial Hashing for Collision Detection of Deformable Objects. Vision, Modeling, Visualization (2003).",
    title: "Optimized Spatial Hashing for Collision Detection of Deformable Objects",
    url: "https://matthias-research.github.io/pages/publications/tetraederCollision.pdf",
    doi: "primary manuscript",
    constrains:
      "Regular spatial partitioning limits local-neighbour candidates without all-pairs searches.",
    implementation:
      "A bounded 20 µm counting grid uses prefix offsets and stable contiguous members; no hash-map iteration occurs.",
    parameterStatus:
      "Algorithm adapted to the finite 400 × 260 µm slide.",
    validity:
      "Performance method only; the grid does not assert biological compartmentalization.",
    anchors: ["determinism"],
  },
];

