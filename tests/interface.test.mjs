import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

import {
  INTERACTIVE_SHORTCUT_SELECTOR,
  shouldIgnoreGlobalShortcut,
} from "../src/input.js";
import {
  parseRecipeState,
  recipeSearchParams,
} from "../src/recipe.js";
import { BiologicalEngine } from "../src/engine.js";
import { specimenCssPixelsPerMicrometre } from "../src/renderer.js";

const index = await readFile(new URL("../index.html", import.meta.url), "utf8");
const main = await readFile(new URL("../src/main.js", import.meta.url), "utf8");
const renderer = await readFile(
  new URL("../src/renderer.js", import.meta.url),
  "utf8",
);
const styles = await readFile(new URL("../src/styles.css", import.meta.url), "utf8");
const engine = await readFile(new URL("../engine/src/world.rs", import.meta.url), "utf8");
const contract = await readFile(
  new URL("../BIOLOGICAL_MODEL_CONTRACT.md", import.meta.url),
  "utf8",
);

test("lab exposes presets, composition tools, observations, and measurements", () => {
  for (const expected of [
    'id="preset-select"',
    'id="specimen-canvas"',
    'id="entity-tray"',
    'data-kind="1"',
    'data-kind="2"',
    'data-kind="3"',
    'data-kind="10"',
    'data-kind="11"',
    'data-kind="4"',
    'data-kind="5"',
    'data-view="0"',
    'data-view="1"',
    'data-view="2"',
    'id="metrics-chart"',
    'id="event-log"',
  ]) {
    assert.match(index, new RegExp(expected));
  }
});

test("canvas actions have keyboard and live-text equivalents", () => {
  assert.match(index, /tabindex="0"/);
  assert.match(index, /id="canvas-status" aria-live="polite"/);
  assert.match(main, /arrowleft/);
  assert.match(main, /key === "enter"/);
  assert.match(main, /application\/x-biological-entity/);
});

test("fresh and legacy recipe URLs resolve deterministically", () => {
  assert.deepEqual(parseRecipeState(""), {
    preset: 1,
    seed: "164271829",
    view: 0,
    speed: 10,
  });
  assert.deepEqual(
    parseRecipeState("?preset=0&seed=42&view=2&speed=30"),
    {
      preset: 0,
      seed: "42",
      view: 2,
      speed: 30,
    },
  );

  const named = parseRecipeState(
    "?version=1&preset=cortical&seed=18446744073709551615&view=fluorescence&speed=2",
  );
  assert.deepEqual(named, {
    preset: 3,
    seed: "18446744073709551615",
    view: 1,
    speed: 2,
  });
  assert.deepEqual(parseRecipeState(recipeSearchParams(named)), named);
});

test("recipe parser rejects invalid views and undeclared rates", () => {
  assert.deepEqual(
    parseRecipeState("?preset=cortical&view=not-a-view&speed=10"),
    {
      preset: 3,
      seed: "164271829",
      view: 0,
      speed: 1,
    },
  );
  assert.deepEqual(
    parseRecipeState("?preset=host-microbe&view=NaN&speed=Infinity"),
    {
      preset: 1,
      seed: "164271829",
      view: 0,
      speed: 10,
    },
  );
  assert.deepEqual(
    parseRecipeState("?preset=pursuit&view=labels&speed=0.5"),
    {
      preset: 2,
      seed: "164271829",
      view: 1,
      speed: 30,
    },
  );
});

test("recipe parser rejects unsupported explicit versions but keeps legacy URLs", () => {
  const fallback = {
    preset: 1,
    seed: "164271829",
    view: 0,
    speed: 10,
  };
  assert.deepEqual(
    parseRecipeState("?version=2&preset=cortical&seed=42&view=2&speed=2"),
    fallback,
  );
  assert.deepEqual(
    parseRecipeState("?version=&preset=pursuit&seed=7&view=1&speed=30"),
    fallback,
  );
  assert.deepEqual(parseRecipeState("?preset=3&seed=42&view=1&speed=2"), {
    preset: 3,
    seed: "42",
    view: 1,
    speed: 2,
  });
});

test("shared recipes are versioned, named, and retain every restart input", () => {
  const parameters = recipeSearchParams({
    preset: 2,
    seed: "9007199254740993",
    view: 2,
    speed: 10,
  });

  assert.equal(
    parameters.toString(),
    "version=1&preset=pursuit&seed=9007199254740993&view=chemistry&speed=10",
  );
  assert.deepEqual(parseRecipeState(parameters), {
    preset: 2,
    seed: "9007199254740993",
    view: 2,
    speed: 10,
  });
  assert.match(main, /seed = normalizeSeed\(seed\)/);
  assert.doesNotMatch(main, /normalizeSeed\(dom\.seed\.value \|\| seed\)/);
});

test("global shortcuts preserve focused interactive controls and canvas access", () => {
  for (const selector of [
    "button",
    "input",
    "select",
    "textarea",
    "a[href]",
    "[contenteditable]",
    "[tabindex]",
  ]) {
    assert.match(INTERACTIVE_SHORTCUT_SELECTOR, new RegExp(escapeRegex(selector)));
  }

  const canvas = {};
  const button = {};
  const buttonChild = { closest: () => button };
  const documentBody = { closest: () => null };

  assert.equal(shouldIgnoreGlobalShortcut(buttonChild, canvas), true);
  assert.equal(shouldIgnoreGlobalShortcut(documentBody, canvas), false);
  assert.equal(shouldIgnoreGlobalShortcut(canvas, canvas), false);
  assert.match(main, /shouldIgnoreGlobalShortcut\(target, dom\.canvas\)/);
});

test("50 micrometre scale bar follows responsive specimen geometry", () => {
  assert.equal(specimenCssPixelsPerMicrometre(800, 520) * 50, 100);
  assert.equal(specimenCssPixelsPerMicrometre(1_200, 520) * 50, 100);
  assert.equal(specimenCssPixelsPerMicrometre(800, 900) * 50, 100);
  assert.equal(specimenCssPixelsPerMicrometre(400, 260) * 50, 50);
  assert.match(index, /id="scale-bar-length"/);
  assert.match(main, /50 \* cssPixelsPerMicrometre/);
  assert.doesNotMatch(styles, /\.scale-bar span\s*\{[^}]*width:\s*80px/s);
});

test("chemistry channels use distinct patterns and an accessible text legend", () => {
  assert.match(index, /id="chemistry-legend"/);
  assert.match(index, /Chemistry view pattern legend/);
  assert.match(index, /solid contours · mM/);
  assert.match(index, /dotted field · nM-eq/);
  assert.match(main, /dom\.chemistryLegend\.hidden = view !== 2/);
  assert.match(renderer, /float glucoseContours/);
  assert.match(renderer, /float cueDots/);
  assert.match(renderer, /vec3\(0\.16\) \* glucoseContours/);
  assert.match(renderer, /vec3\(0\.24\) \* cueDots/);
  assert.doesNotMatch(renderer, /\(values\.r \+ values\.g\) \* 8\.0/);
});

test("reduced-order badge remains visible on compact layouts", () => {
  assert.match(index, /<span>Reduced-order<\/span>/);
  assert.doesNotMatch(
    styles,
    /\.model-status\s*\{[^}]*display:\s*none/s,
  );
  assert.match(
    styles,
    /@media \(max-width: 920px\)[\s\S]*?\.model-status\s*\{[^}]*min-height:\s*34px/,
  );
});

test("incompatible entities remain visible, inert, and explicitly explained", () => {
  assert.doesNotMatch(styles, /\.entity-tool:not\(\.neural-tool\)/);
  assert.doesNotMatch(styles, /\.neural-tool[\s\S]{0,80}display:\s*none/);
  assert.match(main, /button\.setAttribute\("aria-disabled", String\(!compatible\)\)/);
  assert.match(main, /button\.draggable = compatible/);
  assert.match(main, /Unsupported · inert in this chassis/);
  assert.match(main, /reportUnsupportedEntity\(button\)/);
});

test("advance failures are visible and deduplicated", () => {
  assert.match(main, /const performedSteps = engine\.advance\(elapsedSeconds\)/);
  assert.match(main, /const statusCode = engine\.statusCode/);
  assert.match(main, /if \(performedSteps > 0\) lastAdvanceStatusCode = 0/);
  assert.match(main, /if \(statusCode === lastAdvanceStatusCode\) return/);
  assert.match(main, /showToast\(message, 5_000\)/);
  assert.match(main, /announce\(message\)/);
});

test("state hashes reconstruct signed Wasm words as unsigned bits", () => {
  const engineWithSignedWords = new BiologicalEngine({
    exports: {
      world_state_hash_low: () => -1,
      world_state_hash_high: () => -2_147_483_648,
    },
  });
  assert.equal(engineWithSignedWords.stateHash(), 0x8000_0000_ffff_ffffn);
});

test("browser randomness never enters simulation state", () => {
  assert.doesNotMatch(main, /Math\.random/);
  assert.match(engine, /Rng::new\(seed\)/);
});

test("model contract declares units, depth, boundaries, and omissions", () => {
  assert.match(contract, /effective liquid depth: 20 µm/);
  assert.match(contract, /zero-flux field boundaries/);
  assert.match(contract, /Glucose is expressed in millimolar/);
  assert.match(contract, /generic reduced proxy/);
  assert.match(contract, /Explicit omissions/);
});

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
