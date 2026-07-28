import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  computeBackingScale,
  MAX_BACKING_PIXELS,
  MAX_DEVICE_PIXEL_RATIO,
  MAX_RENDER_HZ,
} from "../src/render-budget.js";

test("the renderer has an explicit frame and pixel budget", () => {
  assert.equal(MAX_RENDER_HZ, 30);
  assert.equal(MAX_DEVICE_PIXEL_RATIO, 1.5);
  assert.equal(MAX_BACKING_PIXELS, 1920 * 1080);

  for (const { width, height, dpr } of [
    { width: 1280, height: 720, dpr: 2 },
    { width: 1728, height: 1117, dpr: 2 },
    { width: 3840, height: 2160, dpr: 2 },
  ]) {
    const scale = computeBackingScale(width, height, dpr);
    const backingWidth = Math.max(1, Math.floor(width * scale));
    const backingHeight = Math.max(1, Math.floor(height * scale));
    assert.ok(scale <= MAX_DEVICE_PIXEL_RATIO);
    assert.ok(backingWidth * backingHeight <= MAX_BACKING_PIXELS);
  }
});

test("the animation loop stops while hidden and expensive canvas effects stay disabled", async () => {
  const app = await readFile(new URL("../src/app.js", import.meta.url), "utf8");
  const renderer = await readFile(new URL("../src/renderer.js", import.meta.url), "utf8");

  assert.match(app, /document\.visibilityState === "hidden"/);
  assert.match(app, /1000 \/ MAX_RENDER_HZ/);
  assert.doesNotMatch(renderer, /filter\s*=\s*`blur\(/);
  assert.doesNotMatch(renderer, /shadowBlur\s*=/);
  assert.doesNotMatch(renderer, /desynchronized:\s*true/);
});
