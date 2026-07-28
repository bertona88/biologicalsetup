# Scientific references

These primary sources constrain the observation concepts and terminology used in the first BiologicalSetup specimen. They do not validate the current renderer as a quantitative microscope simulation.

## Calcium imaging

- Nakai J, Ohkura M, Imoto K. **A high signal-to-noise Ca²⁺ probe composed of a single green fluorescent protein.** *Nature Biotechnology* 19, 137–141 (2001). DOI: [10.1038/84397](https://doi.org/10.1038/84397)
- Grewe BF, Langer D, Kasper H, Kampa BM, Helmchen F. **High-speed in vivo calcium imaging reveals neuronal network activity with near-millisecond precision.** *Nature Methods* 7, 399–405 (2010). DOI: [10.1038/nmeth.1453](https://doi.org/10.1038/nmeth.1453)
- Zhang Y et al. **Fast and sensitive GCaMP calcium indicators for imaging neural populations.** *Nature* 615, 884–891 (2023). DOI: [10.1038/s41586-023-05828-9](https://doi.org/10.1038/s41586-023-05828-9)

Design constraint: calcium fluorescence is an indirect, sensor-dependent observation of activity with kinetics distinct from membrane voltage.

## Second-harmonic generation

- Nuriya M et al. **Imaging membrane potential in dendritic spines.** *PNAS* 103, 786–790 (2006). DOI: [10.1073/pnas.0510092103](https://doi.org/10.1073/pnas.0510092103)
- Jiang J, Eisenthal KB, Yuste R. **Second harmonic generation in neurons: electro-optic mechanism of membrane potential sensitivity.** *Biophysical Journal* 93, L26–L28 (2007). DOI: [10.1529/biophysj.107.111021](https://doi.org/10.1529/biophysj.107.111021)
- Jiang J, Yuste R. **Second-harmonic generation imaging of membrane potential with photon counting.** *Microscopy and Microanalysis* 14, 526–531 (2008). DOI: [10.1017/S1431927608080811](https://doi.org/10.1017/S1431927608080811)
- Nuriya M, Yasui M. **Membrane potential dynamics of axons in cultured hippocampal neurons probed by second-harmonic-generation imaging.** *Journal of Biomedical Optics* 15, 020503 (2010). DOI: [10.1117/1.3365135](https://doi.org/10.1117/1.3365135)

Design constraint: the first SHG mode assumes a membrane-sensitive preparation and encodes strong polarization/orientation dependence. It must not be described as generic endogenous neuronal contrast.

## Stimulated Raman scattering

- Freudiger CW et al. **Label-free biomedical imaging with high sensitivity by stimulated Raman scattering microscopy.** *Science* 322, 1857–1861 (2008). DOI: [10.1126/science.1165758](https://doi.org/10.1126/science.1165758)
- Hu F et al. **Bioorthogonal chemical imaging of metabolic activities in live mammalian hippocampal tissues with stimulated Raman scattering.** *Scientific Reports* 6, 39660 (2016). DOI: [10.1038/srep39660](https://doi.org/10.1038/srep39660)
- Oh S et al. **Protein and lipid mass concentration measurement in tissues by stimulated Raman scattering microscopy.** *PNAS* 119, e2117938119 (2022). DOI: [10.1073/pnas.2117938119](https://doi.org/10.1073/pnas.2117938119)

Design constraint: SRS is used as chemical/structural contrast. The current implementation reduces tissue chemistry to qualitative lipid-rich and protein-rich channels and does not simulate a Raman spectrum.
