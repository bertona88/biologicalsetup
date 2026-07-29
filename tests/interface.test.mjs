import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

const index = await readFile(new URL("../index.html", import.meta.url), "utf8");
const main = await readFile(new URL("../src/main.js", import.meta.url), "utf8");
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

