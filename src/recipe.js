import { PRESET_CATALOG } from "./catalog.js";
import { PRESETS } from "./engine.js";

export const DEFAULT_RECIPE = Object.freeze({
  preset: PRESETS.HOST_MICROBE,
  seed: "164271829",
  view: 0,
});

const VIEW_IDS = Object.freeze({
  phase: 0,
  fluorescence: 1,
  labels: 1,
  chemistry: 2,
});

const VIEW_NAMES = Object.freeze(["phase", "fluorescence", "chemistry"]);

export function parseRecipeState(search) {
  const parameters =
    search instanceof URLSearchParams ? search : new URLSearchParams(search);
  const version = parameters.get("version");
  if (version !== null && version !== "1") return defaultRecipeState();

  const preset = parsePreset(parameters.get("preset"));
  const config = PRESET_CATALOG[preset];

  return Object.freeze({
    preset,
    seed: normalizeSeed(
      parameters.has("seed") ? parameters.get("seed") : DEFAULT_RECIPE.seed,
    ),
    view: parseView(parameters.get("view")),
    speed: parseSpeed(parameters.get("speed"), config),
  });
}

function defaultRecipeState() {
  return Object.freeze({
    ...DEFAULT_RECIPE,
    speed: PRESET_CATALOG[DEFAULT_RECIPE.preset].defaultRate,
  });
}

export function recipeSearchParams(state) {
  const preset = parsePreset(String(state.preset));
  const config = PRESET_CATALOG[preset];
  const view = parseView(String(state.view));
  const speed = parseSpeed(String(state.speed), config);
  const parameters = new URLSearchParams();

  parameters.set("version", "1");
  parameters.set("preset", config.id);
  parameters.set("seed", normalizeSeed(state.seed));
  parameters.set("view", VIEW_NAMES[view]);
  parameters.set("speed", String(speed));
  return parameters;
}

export function normalizeSeed(value) {
  try {
    return BigInt.asUintN(
      64,
      BigInt(String(value).replace(/[^\d]/g, "") || "1"),
    ).toString();
  } catch {
    return DEFAULT_RECIPE.seed;
  }
}

function parsePreset(value) {
  if (value !== null) {
    const normalized = value.trim().toLowerCase();
    const namedPreset = Object.entries(PRESET_CATALOG).find(
      ([, config]) => config.id === normalized,
    );
    if (namedPreset) return Number(namedPreset[0]);

    if (normalized !== "" && Object.hasOwn(PRESET_CATALOG, normalized)) {
      return Number(normalized);
    }
  }
  return DEFAULT_RECIPE.preset;
}

function parseView(value) {
  if (value !== null) {
    const normalized = value.trim().toLowerCase();
    if (Object.hasOwn(VIEW_IDS, normalized)) return VIEW_IDS[normalized];
    if (["0", "1", "2"].includes(normalized)) return Number(normalized);
  }
  return DEFAULT_RECIPE.view;
}

function parseSpeed(value, config) {
  if (value !== null && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed) && config.rateOptions.includes(parsed)) {
      return parsed;
    }
  }
  return config.defaultRate;
}
