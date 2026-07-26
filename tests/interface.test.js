import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("first paint is a specimen canvas rather than a dashboard shell", async () => {
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
  assert.match(html, /data-testid="specimen-canvas"/);
  assert.equal((html.match(/<canvas/g) ?? []).length, 1);
  assert.equal((html.match(/<aside/g) ?? []).length, 0);
  assert.doesNotMatch(html, /experiment-rail|simulationInspector|controlsRoot/);
});

test("the first slice exposes four observation modalities", async () => {
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
  for (const modality of ["phase", "calcium", "shg", "srs"]) {
    assert.match(html, new RegExp(`data-modality="${modality}"`));
  }
});
