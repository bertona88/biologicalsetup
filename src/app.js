import {
  createRatCorticalPatch,
  findNearestNeuron,
  getPatchMetrics,
  MODEL_STEP_SECONDS,
  pokePatch,
  serializePatchView,
  stepPatch,
} from "./model.js";
import { MicroscopeRenderer } from "./renderer.js";
import { clamp } from "./random.js";
import { MAX_RENDER_HZ } from "./render-budget.js";

const elements = {
  canvas: document.querySelector("#specimenCanvas"),
  modalityButtons: [...document.querySelectorAll("[data-modality]")],
  specimenButton: document.querySelector("#specimenButton"),
  specimenSheet: document.querySelector("#specimenSheet"),
  settingsButton: document.querySelector("#settingsButton"),
  settingsSheet: document.querySelector("#settingsSheet"),
  shareButton: document.querySelector("#shareButton"),
  focusRange: document.querySelector("#focusRange"),
  focusOutput: document.querySelector("#focusOutput"),
  exposureRange: document.querySelector("#exposureRange"),
  exposureOutput: document.querySelector("#exposureOutput"),
  polarizationRange: document.querySelector("#polarizationRange"),
  polarizationOutput: document.querySelector("#polarizationOutput"),
  srsBand: document.querySelector("#srsBand"),
  shgSetting: document.querySelector(".shg-setting"),
  srsSetting: document.querySelector(".srs-setting"),
  timeScaleButtons: [...document.querySelectorAll("[data-time-scale]")],
  resetButton: document.querySelector("#resetButton"),
  selectedCell: document.querySelector("#selectedCell"),
  cellType: document.querySelector("#cellType"),
  cellName: document.querySelector("#cellName"),
  voltageReadout: document.querySelector("#voltageReadout"),
  calciumReadout: document.querySelector("#calciumReadout"),
  metabolicReadout: document.querySelector("#metabolicReadout"),
  activityText: document.querySelector("#activityText"),
  activityTrace: document.querySelector("#activityTrace"),
  focusChip: document.querySelector("#focusChip"),
  focusChipValue: document.querySelector("#focusChipValue"),
  scaleBar: document.querySelector(".scale-bar span"),
  scaleLabel: document.querySelector("#scaleLabel"),
  onboarding: document.querySelector("#onboarding"),
  toast: document.querySelector("#toast"),
};

const DEFAULT_SEED = 0x20_26_07_26;
const MODALITY_LABELS = {
  phase: "spontaneous activity",
  calcium: "calcium indicator live",
  shg: "membrane-order contrast",
  srs: "chemical contrast live",
};

function decodeViewFromHash() {
  const fragment = window.location.hash.slice(1);
  if (!fragment.startsWith("state=")) return null;
  try {
    const encoded = fragment.slice(6).replace(/-/g, "+").replace(/_/g, "/");
    const padding = "=".repeat((4 - (encoded.length % 4)) % 4);
    return JSON.parse(decodeURIComponent(escape(atob(encoded + padding))));
  } catch {
    return null;
  }
}

function encodeViewForHash(value) {
  const text = unescape(encodeURIComponent(JSON.stringify(value)));
  return btoa(text).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

const restored = decodeViewFromHash();
let patch = createRatCorticalPatch(restored?.seed ?? DEFAULT_SEED);
const initialView = restored?.view ?? {};
const renderer = new MicroscopeRenderer(elements.canvas, patch, initialView);
let timeScale = 1;
let selectedNeuronId = null;
let pointerDown = false;
let lastPokeTime = -Infinity;
let accumulator = 0;
let previousFrame = performance.now();
let lastRenderedFrame = -Infinity;
let frameRequestId = 0;
let lastUiUpdate = -Infinity;
let toastTimer = 0;
let focusChipTimer = 0;
let onboardingDismissed = false;
const runtimeMetrics = {
  renderedFrames: 0,
  backingPixels: elements.canvas.width * elements.canvas.height,
};
Object.defineProperty(window, "__biologicalSetupMetrics", {
  value: runtimeMetrics,
  configurable: false,
  enumerable: false,
  writable: false,
});

function showToast(message) {
  window.clearTimeout(toastTimer);
  elements.toast.textContent = message;
  elements.toast.classList.add("visible");
  toastTimer = window.setTimeout(() => elements.toast.classList.remove("visible"), 2200);
}

function setSheet(sheet, button, open) {
  sheet.hidden = !open;
  button.setAttribute("aria-expanded", String(open));
}

function closeSheets() {
  setSheet(elements.specimenSheet, elements.specimenButton, false);
  setSheet(elements.settingsSheet, elements.settingsButton, false);
}

function setModality(modality) {
  if (!["phase", "calcium", "shg", "srs"].includes(modality)) return;
  renderer.setView({ modality });
  for (const button of elements.modalityButtons) {
    button.setAttribute("aria-pressed", String(button.dataset.modality === modality));
  }
  elements.shgSetting.hidden = modality !== "shg";
  elements.srsSetting.hidden = modality !== "srs";
  elements.activityText.textContent = MODALITY_LABELS[modality];
  document.documentElement.dataset.modality = modality;
}

function setFocus(value, announce = false) {
  const focusUm = clamp(Number(value), 0, patch.extentUm.depth);
  renderer.setView({ focusUm });
  elements.focusRange.value = String(focusUm);
  elements.focusOutput.value = `${focusUm.toFixed(focusUm % 1 ? 1 : 0)} µm`;
  elements.focusChipValue.textContent = elements.focusOutput.value;
  if (announce) {
    elements.focusChip.hidden = false;
    window.clearTimeout(focusChipTimer);
    focusChipTimer = window.setTimeout(() => {
      elements.focusChip.hidden = true;
    }, 850);
  }
}

function setExposure(value) {
  const exposure = clamp(Number(value), 0.45, 1.8);
  renderer.setView({ exposure });
  elements.exposureRange.value = String(exposure);
  elements.exposureOutput.value = `${exposure.toFixed(2)}×`;
}

function setPolarization(value) {
  const polarizationDegrees = clamp(Number(value), 0, 180);
  renderer.setView({ polarizationDegrees });
  elements.polarizationRange.value = String(polarizationDegrees);
  elements.polarizationOutput.value = `${Math.round(polarizationDegrees)}°`;
}

function setSrsBand(value) {
  const srsBand = ["composite", "lipid", "protein"].includes(value) ? value : "composite";
  renderer.setView({ srsBand });
  elements.srsBand.value = srsBand;
}

function setTimeScale(value) {
  timeScale = [0, 1, 4].includes(Number(value)) ? Number(value) : 1;
  for (const button of elements.timeScaleButtons) {
    button.setAttribute("aria-pressed", String(Number(button.dataset.timeScale) === timeScale));
  }
  elements.activityText.textContent = timeScale === 0 ? "specimen paused" : MODALITY_LABELS[renderer.view.modality];
}

function updateScaleBar() {
  const preferredUm = window.innerWidth < 700 ? 10 : 20;
  elements.scaleBar.style.width = `${preferredUm * renderer.pixelsPerUm()}px`;
  elements.scaleLabel.textContent = `${preferredUm} µm`;
}

function selectNeuron(neuron) {
  selectedNeuronId = neuron?.id ?? null;
  renderer.setPointer({ selectedId: selectedNeuronId });
  elements.selectedCell.hidden = !neuron;
  if (!neuron) return;
  elements.cellType.textContent = `${neuron.type.toUpperCase()} NEURON · ${neuron.outgoing.length} OUTPUTS`;
  elements.cellName.textContent = neuron.name;
}

function updateSelectedReadout() {
  const neuron = selectedNeuronId ? patch.neuronById.get(selectedNeuronId) : null;
  if (!neuron) {
    elements.selectedCell.hidden = true;
    return;
  }
  const state = neuron.state;
  elements.selectedCell.hidden = false;
  elements.voltageReadout.textContent = `${Math.round(state.voltageMv).toLocaleString("en-US").replace("-", "−")} mV`;
  elements.calciumReadout.textContent = state.indicator > 0.72
    ? "high"
    : state.indicator > 0.34
      ? "elevated"
      : "resting";
  elements.metabolicReadout.textContent = `${Math.round(state.metabolic * 100)}%`;
}

function dismissOnboarding() {
  if (onboardingDismissed) return;
  onboardingDismissed = true;
  elements.onboarding.classList.add("hidden");
  window.setTimeout(() => {
    elements.onboarding.hidden = true;
  }, 520);
}

function pointerCoordinates(event) {
  const rect = elements.canvas.getBoundingClientRect();
  const screenX = event.clientX - rect.left;
  const screenY = event.clientY - rect.top;
  const world = renderer.screenToWorld(screenX, screenY);
  return {
    screenX,
    screenY,
    xUm: world.x,
    yUm: world.y,
  };
}

function pokeAt(event, force = 1) {
  const now = performance.now();
  if (now - lastPokeTime < 42 && event.type === "pointermove") return;
  lastPokeTime = now;
  const point = pointerCoordinates(event);
  const neuron = pokePatch(patch, point.xUm, point.yUm, force);
  if (neuron) selectNeuron(neuron);
  renderer.setPointer({
    visible: true,
    down: pointerDown,
    xUm: point.xUm,
    yUm: point.yUm,
  });
  dismissOnboarding();
}

function resetSpecimen() {
  const seed = patch.seed;
  patch = createRatCorticalPatch(seed);
  renderer.setPatch(patch);
  accumulator = 0;
  selectedNeuronId = null;
  selectNeuron(null);
  showToast("Specimen returned to its initial state");
}

function applyRestoredView() {
  setModality(renderer.view.modality);
  setFocus(renderer.view.focusUm);
  setExposure(renderer.view.exposure);
  setPolarization(renderer.view.polarizationDegrees);
  setSrsBand(renderer.view.srsBand);
  setTimeScale(1);
}

for (const button of elements.modalityButtons) {
  button.addEventListener("click", () => setModality(button.dataset.modality));
}

elements.specimenButton.addEventListener("click", (event) => {
  event.stopPropagation();
  const nextOpen = elements.specimenSheet.hidden;
  setSheet(elements.settingsSheet, elements.settingsButton, false);
  setSheet(elements.specimenSheet, elements.specimenButton, nextOpen);
});

elements.settingsButton.addEventListener("click", (event) => {
  event.stopPropagation();
  const nextOpen = elements.settingsSheet.hidden;
  setSheet(elements.specimenSheet, elements.specimenButton, false);
  setSheet(elements.settingsSheet, elements.settingsButton, nextOpen);
});

elements.specimenSheet.addEventListener("click", (event) => event.stopPropagation());
elements.settingsSheet.addEventListener("click", (event) => event.stopPropagation());
document.addEventListener("click", closeSheets);

elements.focusRange.addEventListener("input", () => setFocus(elements.focusRange.value));
elements.exposureRange.addEventListener("input", () => setExposure(elements.exposureRange.value));
elements.polarizationRange.addEventListener("input", () => setPolarization(elements.polarizationRange.value));
elements.srsBand.addEventListener("change", () => setSrsBand(elements.srsBand.value));
for (const button of elements.timeScaleButtons) {
  button.addEventListener("click", () => setTimeScale(button.dataset.timeScale));
}

elements.resetButton.addEventListener("click", resetSpecimen);

elements.shareButton.addEventListener("click", async () => {
  const state = serializePatchView(patch, renderer.view);
  const url = new URL(window.location.href);
  url.hash = `state=${encodeViewForHash(state)}`;
  window.history.replaceState(null, "", url);
  try {
    await navigator.clipboard.writeText(url.href);
    showToast("Specimen view copied");
  } catch {
    showToast("Shareable state added to the address");
  }
});

elements.canvas.addEventListener("pointerenter", (event) => {
  const point = pointerCoordinates(event);
  renderer.setPointer({ visible: true, xUm: point.xUm, yUm: point.yUm });
});

elements.canvas.addEventListener("pointermove", (event) => {
  const point = pointerCoordinates(event);
  renderer.setPointer({ visible: true, down: pointerDown, xUm: point.xUm, yUm: point.yUm });
  if (pointerDown) pokeAt(event, event.pointerType === "touch" ? 0.85 : 0.58);
});

elements.canvas.addEventListener("pointerdown", (event) => {
  pointerDown = true;
  elements.canvas.setPointerCapture?.(event.pointerId);
  renderer.setPointer({ down: true });
  pokeAt(event, event.pointerType === "touch" ? 1.15 : 1);
});

function releasePointer(event) {
  pointerDown = false;
  renderer.setPointer({ down: false });
  elements.canvas.releasePointerCapture?.(event.pointerId);
}

elements.canvas.addEventListener("pointerup", releasePointer);
elements.canvas.addEventListener("pointercancel", releasePointer);
elements.canvas.addEventListener("pointerleave", () => {
  if (!pointerDown) renderer.setPointer({ visible: false });
});

elements.canvas.addEventListener(
  "wheel",
  (event) => {
    event.preventDefault();
    if (event.ctrlKey || event.metaKey) {
      const zoom = renderer.view.zoom * Math.exp(-event.deltaY * 0.0018);
      renderer.setView({ zoom });
      updateScaleBar();
      return;
    }
    setFocus(renderer.view.focusUm + event.deltaY * 0.018, true);
  },
  { passive: false },
);

elements.canvas.addEventListener("contextmenu", (event) => {
  event.preventDefault();
  const point = pointerCoordinates(event);
  const hit = findNearestNeuron(patch, point.xUm, point.yUm, 22);
  selectNeuron(hit?.neuron ?? null);
});

window.addEventListener("keydown", (event) => {
  if (event.target instanceof HTMLInputElement || event.target instanceof HTMLSelectElement) return;
  if (["1", "2", "3", "4"].includes(event.key)) {
    setModality(["phase", "calcium", "shg", "srs"][Number(event.key) - 1]);
  } else if (event.key === " ") {
    event.preventDefault();
    setTimeScale(timeScale === 0 ? 1 : 0);
  } else if (event.key.toLowerCase() === "r") {
    resetSpecimen();
  } else if (event.key === "Escape") {
    closeSheets();
    selectNeuron(null);
  }
});

window.addEventListener("resize", () => {
  renderer.resize();
  updateScaleBar();
});

function updateUi(now) {
  if (now - lastUiUpdate < 90) return;
  lastUiUpdate = now;
  updateSelectedReadout();
  const metrics = getPatchMetrics(patch);
  const traceScale = clamp(0.25 + metrics.recentSpikeRateHz / 8, 0.25, 1.8);
  elements.activityTrace.style.transform = `scaleY(${traceScale})`;
  if (timeScale !== 0 && metrics.recentSpikeRateHz > 10) {
    elements.activityText.textContent = "correlated network burst";
  } else if (timeScale !== 0) {
    elements.activityText.textContent = MODALITY_LABELS[renderer.view.modality];
  }
}

function scheduleFrame() {
  if (frameRequestId || document.visibilityState === "hidden") return;
  frameRequestId = requestAnimationFrame(frame);
}

function frame(now) {
  frameRequestId = 0;
  if (document.visibilityState === "hidden") return;
  if (now - lastRenderedFrame < 1000 / MAX_RENDER_HZ) {
    scheduleFrame();
    return;
  }
  lastRenderedFrame = now;
  const elapsed = Math.min(0.06, Math.max(0, (now - previousFrame) / 1000));
  previousFrame = now;
  if (timeScale > 0) {
    accumulator += elapsed * timeScale;
    let steps = 0;
    while (accumulator >= MODEL_STEP_SECONDS && steps < 140) {
      stepPatch(patch, MODEL_STEP_SECONDS);
      accumulator -= MODEL_STEP_SECONDS;
      steps += 1;
    }
    if (steps === 140) accumulator = 0;
  }
  renderer.render(now / 1000);
  runtimeMetrics.renderedFrames += 1;
  runtimeMetrics.backingPixels = elements.canvas.width * elements.canvas.height;
  updateUi(now);
  scheduleFrame();
}

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState !== "visible") return;
  previousFrame = performance.now();
  lastRenderedFrame = -Infinity;
  scheduleFrame();
});

applyRestoredView();
updateScaleBar();
scheduleFrame();
window.setTimeout(dismissOnboarding, 10_000);
