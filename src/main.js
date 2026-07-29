import "./styles.css";

import { MetricChart } from "./chart.js";
import {
  CULTURE_RULES,
  ENTITY_CATALOG,
  NEURAL_RULES,
  PRESET_CATALOG,
} from "./catalog.js";
import {
  BiologicalEngine,
  ENTITY_KIND,
  PRESETS,
} from "./engine.js";
import { SlideRenderer } from "./renderer.js";

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

const dom = {
  app: $("#app"),
  canvas: $("#specimen-canvas"),
  canvasStatus: $("#canvas-status"),
  engineBadge: $("#engine-badge span:last-child"),
  preset: $("#preset-select"),
  slideTitle: $("#slide-title"),
  modelFamily: $("#model-family"),
  modelStatus: $("#model-status"),
  modelSheet: $("#model-sheet"),
  modelSheetContent: $("#model-sheet-content"),
  closeModelSheet: $("#close-model-sheet"),
  entityTray: $("#entity-tray"),
  analysisPanel: $("#analysis-panel"),
  mobileTools: $("#mobile-tools"),
  mobileAnalysis: $("#mobile-analysis"),
  closeTools: $("#close-tools"),
  closeAnalysis: $("#close-analysis"),
  cursorReadout: $("#cursor-readout"),
  metricPrimary: $("#metric-primary"),
  metricPrimaryLabel: $("#metric-primary-label"),
  metricPrimaryUnit: $("#metric-primary-unit"),
  metricSecondary: $("#metric-secondary"),
  metricSecondaryLabel: $("#metric-secondary-label"),
  metricSecondaryUnit: $("#metric-secondary-unit"),
  metricTertiary: $("#metric-tertiary"),
  metricTertiaryLabel: $("#metric-tertiary-label"),
  metricTertiaryUnit: $("#metric-tertiary-unit"),
  chart: $("#metrics-chart"),
  chartKey: $("#chart-key"),
  selection: $("#selection-card"),
  eventLog: $("#event-log"),
  eventCount: $("#event-count"),
  playPause: $("#play-pause"),
  stepOnce: $("#step-once"),
  time: $("#time-value"),
  timeUnit: $("#time-unit"),
  speed: $("#speed-select"),
  seed: $("#seed-input"),
  reset: $("#reset-button"),
  share: $("#share-button"),
  progress: $("#timeline-progress"),
  progressMarker: $("#timeline-marker"),
  onboarding: $("#onboarding"),
  dismissOnboarding: $("#dismiss-onboarding"),
  toast: $("#toast"),
};

const chart = new MetricChart(dom.chart);
const urlState = new URLSearchParams(window.location.search);
let preset = validPreset(Number(urlState.get("preset"))) ?? PRESETS.HOST_MICROBE;
let seed = normalizeSeed(urlState.get("seed") ?? "164271829");
let view = clamp(Number(urlState.get("view") ?? 0), 0, 2);
let speed = Number(urlState.get("speed")) || PRESET_CATALOG[preset].defaultRate;
let activeTool = { type: "place", kind: ENTITY_KIND.BACTERIUM };
let selectedId = 0;
let paused = false;
let engine;
let renderer;
let frame;
let animationId;
let lastAnimationTime = performance.now();
let lastRenderTime = 0;
let lastSampleTime = 0;
let eventTotal = 0;
let lastCounters = { divisions: 0, engulfments: 0, spikes: 0 };
let toastTimer;
const keyboardCursor = { x: 200, y: 130 };

initialize().catch((error) => {
  console.error(error);
  dom.app.dataset.error = "true";
  dom.engineBadge.textContent = "Engine unavailable";
  showToast(error.message, 10_000);
  dom.canvasStatus.textContent = `Simulation failed to start: ${error.message}`;
});

async function initialize() {
  engine = await BiologicalEngine.load();
  renderer = new SlideRenderer(dom.canvas);
  bindInterface();
  resetWorld({ announce: false });
  setView(view);
  dom.app.dataset.ready = "true";
  dom.engineBadge.textContent = `Rust · WASM ABI ${engine.exports.engine_version()}`;
  if (sessionStorage.getItem("biologicalsetup:onboarded") === "true") {
    dom.onboarding.classList.add("hidden");
  }
  animationId = requestAnimationFrame(animate);
}

function bindInterface() {
  dom.preset.addEventListener("change", () => {
    preset = Number(dom.preset.value);
    resetWorld();
  });

  $$(".view-button").forEach((button) => {
    button.addEventListener("click", () => {
      if (button.disabled) return;
      setView(Number(button.dataset.view));
    });
  });

  $$(".entity-tool").forEach((button) => {
    button.addEventListener("click", () => {
      if (button.getAttribute("aria-disabled") === "true") {
        showToast("That entity has no interaction model in this specimen.");
        return;
      }
      choosePlacement(Number(button.dataset.kind));
      if (window.innerWidth <= 920) closeDrawers();
    });
    button.addEventListener("dragstart", (event) => {
      if (button.getAttribute("aria-disabled") === "true") {
        event.preventDefault();
        return;
      }
      event.dataTransfer.effectAllowed = "copy";
      event.dataTransfer.setData("application/x-biological-entity", button.dataset.kind);
      choosePlacement(Number(button.dataset.kind));
    });
  });

  $$(".utility-tool").forEach((button) => {
    button.addEventListener("click", () => {
      chooseUtility(button.dataset.tool);
      if (window.innerWidth <= 920) closeDrawers();
    });
  });

  dom.canvas.addEventListener("pointermove", (event) => {
    const point = renderer.worldCoordinates(event.clientX, event.clientY);
    if (!point.inside) {
      dom.cursorReadout.textContent = "outside specimen";
      return;
    }
    dom.cursorReadout.textContent = `x ${point.x.toFixed(0).padStart(3, "0")} · y ${point.y
      .toFixed(0)
      .padStart(3, "0")} µm`;
  });
  dom.canvas.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) return;
    const point = renderer.worldCoordinates(event.clientX, event.clientY);
    actOnSlide(point);
  });
  dom.canvas.addEventListener("dragover", (event) => {
    if (event.dataTransfer.types.includes("application/x-biological-entity")) {
      event.preventDefault();
      event.dataTransfer.dropEffect = "copy";
    }
  });
  dom.canvas.addEventListener("drop", (event) => {
    event.preventDefault();
    const kind = Number(
      event.dataTransfer.getData("application/x-biological-entity"),
    );
    if (!kind) return;
    activeTool = { type: "place", kind };
    const point = renderer.worldCoordinates(event.clientX, event.clientY);
    actOnSlide(point);
  });

  dom.playPause.addEventListener("click", togglePause);
  dom.stepOnce.addEventListener("click", () => {
    if (!paused) setPaused(true);
    const dt = preset === PRESETS.CORTICAL ? 0.001 : 0.05;
    engine.advance(dt);
    renderNow();
    announce(`Advanced one ${preset === PRESETS.CORTICAL ? "millisecond" : "model step"}.`);
  });
  dom.speed.addEventListener("change", () => {
    speed = Number(dom.speed.value);
    addEvent(`Time rate changed to ${speed}×.`);
  });
  dom.reset.addEventListener("click", () => resetWorld());
  dom.seed.addEventListener("change", () => {
    seed = normalizeSeed(dom.seed.value);
    dom.seed.value = seed;
    resetWorld();
  });
  dom.seed.addEventListener("keydown", (event) => {
    if (event.key === "Enter") dom.seed.blur();
  });
  dom.share.addEventListener("click", shareRecipe);

  dom.modelStatus.addEventListener("click", openModelSheet);
  dom.closeModelSheet.addEventListener("click", closeModelSheet);
  dom.modelSheet.addEventListener("click", (event) => {
    if (event.target === dom.modelSheet) closeModelSheet();
  });

  dom.mobileTools.addEventListener("click", () => toggleDrawer("tools"));
  dom.mobileAnalysis.addEventListener("click", () => toggleDrawer("analysis"));
  dom.closeTools.addEventListener("click", closeDrawers);
  dom.closeAnalysis.addEventListener("click", closeDrawers);
  dom.dismissOnboarding.addEventListener("click", dismissOnboarding);
  dom.onboarding.addEventListener("click", dismissOnboarding);

  document.addEventListener("visibilitychange", () => {
    lastAnimationTime = performance.now();
  });
  window.addEventListener("keydown", handleKeyboard);
}

function animate(timestamp) {
  const elapsed = Math.min(0.1, Math.max(0, (timestamp - lastAnimationTime) / 1_000));
  lastAnimationTime = timestamp;
  if (!paused && document.visibilityState === "visible") {
    engine.advance(elapsed * speed);
  }
  if (timestamp - lastRenderTime >= 1000 / 30) {
    renderNow(timestamp);
    lastRenderTime = timestamp;
  }
  animationId = requestAnimationFrame(animate);
}

function renderNow(timestamp = performance.now()) {
  frame = engine.readFrame();
  renderer.view = view;
  renderer.selected = selectedId;
  renderer.render(frame, frame.metrics[0]);
  updateTime(frame.metrics[0]);
  updateSelection(frame);
  if (timestamp - lastSampleTime >= 750) {
    updateMeasurements(frame);
    sampleEvents(frame);
    lastSampleTime = timestamp;
  }
}

function resetWorld({ announce: shouldAnnounce = true } = {}) {
  seed = normalizeSeed(dom.seed.value || seed);
  dom.seed.value = seed;
  dom.preset.value = String(preset);
  engine.reset(seed, preset);
  selectedId = 0;
  frame = engine.readFrame();
  lastCounters = { divisions: 0, engulfments: 0, spikes: 0 };
  eventTotal = 0;
  dom.eventLog.replaceChildren();
  addEvent("Deterministic specimen initialized.");
  chart.clear();
  configurePresetInterface();
  updateMeasurements(frame);
  updateSelection(frame);
  renderer.selected = 0;
  renderer.render(frame, 0);
  if (shouldAnnounce) {
    showToast(`${PRESET_CATALOG[preset].name} reset from seed ${seed}.`);
    announce(`${PRESET_CATALOG[preset].name} reset.`);
  }
}

function configurePresetInterface() {
  const config = PRESET_CATALOG[preset];
  dom.app.dataset.preset = String(preset);
  dom.slideTitle.textContent = config.name;
  dom.modelFamily.textContent = config.family;
  dom.preset.value = String(preset);
  dom.speed.replaceChildren(
    ...config.rateOptions.map((option) => {
      const element = document.createElement("option");
      element.value = String(option);
      element.textContent = `${option}×`;
      return element;
    }),
  );
  if (!config.rateOptions.includes(speed)) speed = config.defaultRate;
  dom.speed.value = String(speed);
  dom.timeUnit.textContent =
    preset === PRESETS.CORTICAL ? "neural time · 1 ms step" : "biological time · 50 ms step";

  configureMetric(dom.metricPrimaryLabel, dom.metricPrimaryUnit, config.primaryMetric);
  configureMetric(
    dom.metricSecondaryLabel,
    dom.metricSecondaryUnit,
    config.secondaryMetric,
  );
  configureMetric(
    dom.metricTertiaryLabel,
    dom.metricTertiaryUnit,
    config.tertiaryMetric,
  );
  dom.chartKey.innerHTML = `
    <span><i class="key-a"></i><b>${config.chart[0]}</b></span>
    <span><i class="key-b"></i><b>${config.chart[2]}</b></span>
  `;

  const chemistryButton = $('.view-button[data-view="2"]');
  chemistryButton.disabled = preset === PRESETS.CORTICAL;
  chemistryButton.title =
    preset === PRESETS.CORTICAL
      ? "This neural chassis has no extracellular chemistry field."
      : "";
  if (preset === PRESETS.CORTICAL && view === 2) setView(0);

  if (preset === PRESETS.CORTICAL) {
    chooseUtility("stimulate");
  } else {
    choosePlacement(ENTITY_KIND.BACTERIUM);
  }
}

function configureMetric(labelElement, unitElement, definition) {
  labelElement.textContent = definition[0];
  unitElement.textContent = definition[2];
}

function updateMeasurements(currentFrame) {
  const config = PRESET_CATALOG[preset];
  const metrics = currentFrame.metrics;
  dom.metricPrimary.textContent = formatMetric(metrics[config.primaryMetric[1]]);
  dom.metricSecondary.textContent = formatMetric(metrics[config.secondaryMetric[1]]);
  dom.metricTertiary.textContent = formatMetric(metrics[config.tertiaryMetric[1]]);

  const chartA = valueForChart(config.chart[1], currentFrame);
  const chartB = valueForChart(config.chart[3], currentFrame);
  chart.push(chartA, chartB);
}

function valueForChart(index, currentFrame) {
  if (index !== "calcium") return currentFrame.metrics[index];
  let sum = 0;
  let count = 0;
  for (let offset = 0; offset < currentFrame.entities.length; offset += currentFrame.stride) {
    const kind = currentFrame.entities[offset + 1];
    if (kind === ENTITY_KIND.NEURON_EXCITATORY || kind === ENTITY_KIND.NEURON_INHIBITORY) {
      sum += currentFrame.entities[offset + 7];
      count += 1;
    }
  }
  return count ? sum / count : 0;
}

function sampleEvents(currentFrame) {
  const metrics = currentFrame.metrics;
  const counters = {
    divisions: Math.round(metrics[9]),
    engulfments: Math.round(metrics[10]),
    spikes: Math.round(metrics[11]),
  };
  const divisionDelta = counters.divisions - lastCounters.divisions;
  const engulfmentDelta = counters.engulfments - lastCounters.engulfments;
  const spikeDelta = counters.spikes - lastCounters.spikes;
  if (divisionDelta > 0) {
    addEvent(
      `${divisionDelta} bacterial division${divisionDelta === 1 ? "" : "s"} completed.`,
    );
  }
  if (engulfmentDelta > 0) {
    addEvent(
      `${engulfmentDelta} finite engulfment event${engulfmentDelta === 1 ? "" : "s"} completed.`,
    );
  }
  if (spikeDelta > 0) {
    addEvent(`${spikeDelta} spike${spikeDelta === 1 ? "" : "s"} emitted.`);
  }
  lastCounters = counters;
}

function updateSelection(currentFrame) {
  if (!selectedId) {
    dom.selection.innerHTML = `
      <div class="empty-selection">
        <span aria-hidden="true">⌖</span>
        <p>Select an entity to inspect its engine state.</p>
      </div>
    `;
    return;
  }
  const entity = findEntity(currentFrame, selectedId);
  if (!entity) {
    selectedId = 0;
    renderer.selected = 0;
    updateSelection(currentFrame);
    return;
  }
  const config = ENTITY_CATALOG[entity[1]];
  if (!config) return;
  const values = config.values
    .map(
      ([name, index, unit]) => `
        <div>
          <dt>${name}</dt>
          <dd>${formatState(entity[index])} <span>${unit}</span></dd>
        </div>
      `,
    )
    .join("");
  dom.selection.innerHTML = `
    <div class="selection-title">
      <div>
        <h3>${config.name}</h3>
        <small>${config.scientificName}</small>
      </div>
      <small>#${Math.round(entity[0])}</small>
    </div>
    <dl class="selection-values">${values}</dl>
    <p class="selection-note">${config.note}
      <a href="./references.html#${config.reference}">Source map →</a>
    </p>
  `;
}

function findEntity(currentFrame, id) {
  for (let offset = 0; offset < currentFrame.entities.length; offset += currentFrame.stride) {
    if (Math.round(currentFrame.entities[offset]) === id) {
      return currentFrame.entities.subarray(offset, offset + currentFrame.stride);
    }
  }
  return null;
}

function choosePlacement(kind) {
  activeTool = { type: "place", kind };
  $$(".entity-tool").forEach((button) => {
    button.classList.toggle("active", Number(button.dataset.kind) === kind);
  });
  $$(".utility-tool").forEach((button) => button.classList.remove("active"));
  const config = ENTITY_CATALOG[kind];
  const name =
    config?.short ??
    (kind === ENTITY_KIND.GLUCOSE ? "Glucose pulse" : "Chemoattractant pulse");
  showToast(`${name} selected. Click or tap the slide to place.`);
}

function chooseUtility(type) {
  activeTool = { type };
  $$(".entity-tool").forEach((button) => button.classList.remove("active"));
  $$(".utility-tool").forEach((button) => {
    button.classList.toggle("active", button.dataset.tool === type);
  });
  const descriptions = {
    inspect: "Inspect selected. Choose an entity on the slide.",
    erase: "Erase selected. Choose an entity to remove.",
    stimulate: "Current pulse selected. Choose a neuron to stimulate.",
  };
  showToast(descriptions[type]);
}

function actOnSlide(point) {
  if (!point.inside) {
    showToast("Place actions inside the specimen boundary.");
    return;
  }
  keyboardCursor.x = point.x;
  keyboardCursor.y = point.y;

  if (activeTool.type === "place") {
    const result = engine.place(activeTool.kind, point.x, point.y, 1);
    if (result.status !== "ok") {
      showToast(`No action: ${result.status}.`);
      announce(`Placement rejected: ${result.status}.`);
      return;
    }
    const isField =
      activeTool.kind === ENTITY_KIND.GLUCOSE || activeTool.kind === ENTITY_KIND.CUE;
    if (!isField) {
      selectedId = result.id;
      renderer.selected = result.id;
    }
    const name =
      ENTITY_CATALOG[activeTool.kind]?.short ??
      (activeTool.kind === ENTITY_KIND.GLUCOSE ? "Glucose pulse" : "Cue pulse");
    addEvent(`${name} placed at ${point.x.toFixed(0)}, ${point.y.toFixed(0)} µm.`);
    announce(`${name} placed.`);
    renderNow();
    return;
  }

  if (activeTool.type === "inspect") {
    selectedId = engine.selectAt(point.x, point.y, 12);
    renderer.selected = selectedId;
    if (selectedId) {
      announce(`Selected entity ${selectedId}.`);
    } else {
      showToast("No explicit entity at that point.");
    }
    renderNow();
    return;
  }

  if (activeTool.type === "erase") {
    const removed = engine.removeAt(point.x, point.y, 12);
    if (removed) {
      if (selectedId === removed) selectedId = 0;
      addEvent(`Entity #${removed} removed by user action.`);
      announce(`Entity ${removed} removed.`);
      renderNow();
    } else {
      showToast("No removable entity at that point.");
    }
    return;
  }

  if (activeTool.type === "stimulate") {
    const stimulated = engine.stimulate(point.x, point.y, 1);
    if (stimulated) {
      selectedId = stimulated;
      renderer.selected = stimulated;
      addEvent(`Neuron #${stimulated} received a 900 pA reduced current pulse.`);
      announce(`Neuron ${stimulated} stimulated.`);
      renderNow();
    } else {
      showToast(`No action: ${engine.status}.`);
    }
  }
}

function setView(nextView) {
  view = nextView;
  $$(".view-button").forEach((button) => {
    const active = Number(button.dataset.view) === view;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });
  if (renderer && frame) {
    renderer.view = view;
    renderer.render(frame, frame.metrics[0]);
  }
}

function togglePause() {
  setPaused(!paused);
  addEvent(paused ? "Simulation paused." : "Simulation resumed.");
}

function setPaused(next) {
  paused = next;
  dom.playPause.setAttribute("aria-label", paused ? "Resume simulation" : "Pause simulation");
  dom.playPause.innerHTML = paused
    ? '<span class="play-icon" aria-hidden="true"></span>'
    : '<span class="pause-icon" aria-hidden="true"></span>';
  announce(paused ? "Simulation paused." : "Simulation resumed.");
}

function updateTime(seconds) {
  if (preset === PRESETS.CORTICAL) {
    dom.time.textContent = `${seconds.toFixed(3)} s`;
  } else {
    const minutes = Math.floor(seconds / 60);
    const remainder = seconds - minutes * 60;
    dom.time.textContent = `${String(minutes).padStart(2, "0")}:${remainder
      .toFixed(1)
      .padStart(4, "0")}`;
  }
  const period = preset === PRESETS.CORTICAL ? 2 : 300;
  const percentage = ((seconds % period) / period) * 100;
  dom.progress.style.width = `${percentage}%`;
  dom.progressMarker.style.left = `${percentage}%`;
}

function addEvent(message) {
  eventTotal += 1;
  const item = document.createElement("li");
  const time = document.createElement("time");
  const text = document.createElement("span");
  time.textContent = frame ? eventTime(frame.metrics[0]) : "0:00";
  text.textContent = message;
  item.append(time, text);
  dom.eventLog.prepend(item);
  while (dom.eventLog.children.length > 8) {
    dom.eventLog.lastElementChild.remove();
  }
  dom.eventCount.textContent = `${eventTotal} event${eventTotal === 1 ? "" : "s"}`;
}

function eventTime(seconds) {
  if (preset === PRESETS.CORTICAL) return `${seconds.toFixed(3)}s`;
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${Math.floor(seconds % 60).toString().padStart(2, "0")}`;
}

function openModelSheet() {
  const rules = preset === PRESETS.CORTICAL ? NEURAL_RULES : CULTURE_RULES;
  dom.modelSheetContent.innerHTML = `
    <div class="model-rules">
      ${rules
        .map(
          (rule) => `
            <div class="model-rule">
              <span aria-hidden="true">${rule.symbol}</span>
              <div>
                <strong>${rule.title}</strong>
                <small>${rule.description}</small>
              </div>
              <span class="evidence-tag">${rule.evidence}</span>
            </div>
          `,
        )
        .join("")}
    </div>
  `;
  dom.modelSheet.hidden = false;
  dom.modelStatus.setAttribute("aria-expanded", "true");
  dom.closeModelSheet.focus();
}

function closeModelSheet() {
  dom.modelSheet.hidden = true;
  dom.modelStatus.setAttribute("aria-expanded", "false");
  dom.modelStatus.focus();
}

function shareRecipe() {
  const url = new URL(window.location.href);
  url.search = "";
  url.searchParams.set("preset", String(preset));
  url.searchParams.set("seed", seed);
  url.searchParams.set("view", String(view));
  url.searchParams.set("speed", String(speed));
  navigator.clipboard
    .writeText(url.toString())
    .then(() => {
      showToast("Recipe link copied. It restarts this preset; evolved state is not included.");
    })
    .catch(() => {
      window.history.replaceState(null, "", url);
      showToast("Recipe encoded in the current URL. Evolved state is not included.");
    });
}

function handleKeyboard(event) {
  const target = event.target;
  if (
    target instanceof HTMLInputElement ||
    target instanceof HTMLSelectElement ||
    target instanceof HTMLTextAreaElement
  ) {
    return;
  }

  const key = event.key.toLowerCase();
  if (key === " ") {
    event.preventDefault();
    togglePause();
    return;
  }
  if (key === "r") {
    resetWorld();
    return;
  }
  if (key === "escape") {
    closeDrawers();
    if (!dom.modelSheet.hidden) closeModelSheet();
    chooseUtility("inspect");
    return;
  }
  if (["1", "2", "3"].includes(key)) {
    const nextView = Number(key) - 1;
    const button = $(`.view-button[data-view="${nextView}"]`);
    if (!button.disabled) setView(nextView);
    return;
  }

  const shortcuts = {
    b: ENTITY_KIND.BACTERIUM,
    p: ENTITY_KIND.PHAGOCYTE,
    h: ENTITY_KIND.EPITHELIUM,
    g: ENTITY_KIND.GLUCOSE,
    c: ENTITY_KIND.CUE,
    e: ENTITY_KIND.NEURON_EXCITATORY,
    i: ENTITY_KIND.NEURON_INHIBITORY,
  };
  if (shortcuts[key]) {
    const button = $(`.entity-tool[data-kind="${shortcuts[key]}"]`);
    if (button && button.offsetParent !== null) choosePlacement(shortcuts[key]);
    return;
  }

  if (document.activeElement === dom.canvas) {
    const movement = {
      arrowleft: [-5, 0],
      arrowright: [5, 0],
      arrowup: [0, -5],
      arrowdown: [0, 5],
    }[key];
    if (movement) {
      event.preventDefault();
      keyboardCursor.x = clamp(keyboardCursor.x + movement[0], 0, 400);
      keyboardCursor.y = clamp(keyboardCursor.y + movement[1], 0, 260);
      dom.cursorReadout.textContent = `x ${keyboardCursor.x
        .toFixed(0)
        .padStart(3, "0")} · y ${keyboardCursor.y.toFixed(0).padStart(3, "0")} µm`;
      announce(
        `Placement cursor ${keyboardCursor.x.toFixed(0)}, ${keyboardCursor.y.toFixed(0)} micrometres.`,
      );
      return;
    }
    if (key === "enter") {
      event.preventDefault();
      actOnSlide({ ...keyboardCursor, inside: true });
    }
  }
}

function toggleDrawer(which) {
  const toolsOpen = which === "tools" && !dom.entityTray.classList.contains("open");
  const analysisOpen =
    which === "analysis" && !dom.analysisPanel.classList.contains("open");
  dom.entityTray.classList.toggle("open", toolsOpen);
  dom.analysisPanel.classList.toggle("open", analysisOpen);
  dom.mobileTools.setAttribute("aria-expanded", String(toolsOpen));
  dom.mobileAnalysis.setAttribute("aria-expanded", String(analysisOpen));
}

function closeDrawers() {
  dom.entityTray.classList.remove("open");
  dom.analysisPanel.classList.remove("open");
  dom.mobileTools.setAttribute("aria-expanded", "false");
  dom.mobileAnalysis.setAttribute("aria-expanded", "false");
}

function dismissOnboarding() {
  dom.onboarding.classList.add("hidden");
  sessionStorage.setItem("biologicalsetup:onboarded", "true");
}

function announce(message) {
  dom.canvasStatus.textContent = "";
  requestAnimationFrame(() => {
    dom.canvasStatus.textContent = message;
  });
}

function showToast(message, duration = 2_800) {
  clearTimeout(toastTimer);
  dom.toast.textContent = message;
  dom.toast.classList.add("visible");
  toastTimer = setTimeout(() => dom.toast.classList.remove("visible"), duration);
}

function formatMetric(value) {
  if (!Number.isFinite(value)) return "—";
  if (Math.abs(value) >= 100) return Math.round(value).toLocaleString();
  if (Math.abs(value) >= 10) return value.toFixed(1);
  return value.toFixed(2);
}

function formatState(value) {
  if (!Number.isFinite(value)) return "—";
  if (Math.abs(value) >= 100) return value.toFixed(0);
  if (Math.abs(value) >= 10) return value.toFixed(1);
  return value.toFixed(3);
}

function normalizeSeed(value) {
  try {
    return BigInt.asUintN(64, BigInt(String(value).replace(/[^\d]/g, "") || "1")).toString();
  } catch {
    return "164271829";
  }
}

function validPreset(value) {
  return Object.hasOwn(PRESET_CATALOG, value) ? value : undefined;
}

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}

window.addEventListener("beforeunload", () => {
  if (animationId) cancelAnimationFrame(animationId);
});

