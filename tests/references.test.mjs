import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

import { REFERENCES } from "../src/references-data.js";

const page = await readFile(
  new URL("../references.html", import.meta.url),
  "utf8",
);

test("reference catalog has unique, complete primary-source records", () => {
  assert.ok(REFERENCES.length >= 16);
  const keys = new Set();
  for (const reference of REFERENCES) {
    assert.ok(reference.key);
    assert.ok(!keys.has(reference.key), `duplicate key ${reference.key}`);
    keys.add(reference.key);
    assert.ok(reference.citation);
    assert.ok(reference.title);
    assert.match(reference.url, /^https:\/\//);
    assert.ok(reference.constrains);
    assert.ok(reference.implementation);
    assert.ok(reference.parameterStatus);
    assert.ok(reference.validity);
    assert.ok(reference.anchors.length > 0);
  }
});

test("all scientific domains are represented", () => {
  const domains = new Set(REFERENCES.map((reference) => reference.domain));
  assert.deepEqual(
    domains,
    new Set(["physics", "chemistry", "biology", "observation", "computation"]),
  );
});

test("every reference anchor maps to an executable model row", () => {
  for (const reference of REFERENCES) {
    for (const anchor of reference.anchors) {
      assert.match(page, new RegExp(`id="${anchor}"`));
    }
  }
});

test("reference page exposes filters and an explicit claim gate", () => {
  assert.match(page, /data-domain="physics"/);
  assert.match(page, /data-domain="chemistry"/);
  assert.match(page, /data-domain="biology"/);
  assert.match(page, /data-domain="observation"/);
  assert.match(page, /data-domain="computation"/);
  assert.match(page, /CLAIM GATE/);
});

