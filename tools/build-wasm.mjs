import { copyFileSync, existsSync, mkdirSync, statSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const cargo = process.env.CARGO || "cargo";
const result = spawnSync(
  cargo,
  ["build", "--workspace", "--target", "wasm32-unknown-unknown", "--release"],
  {
    cwd: root,
    env: process.env,
    stdio: "inherit",
  },
);

if (result.error) {
  throw result.error;
}
if (result.status !== 0) {
  process.exit(result.status ?? 1);
}

const source = resolve(
  root,
  "target/wasm32-unknown-unknown/release/biological_engine.wasm",
);
if (!existsSync(source)) {
  throw new Error(`Rust build completed without ${source}`);
}

const outputDirectory = resolve(root, "public");
const output = resolve(outputDirectory, "biological_engine.wasm");
mkdirSync(outputDirectory, { recursive: true });
copyFileSync(source, output);

const kibibytes = (statSync(output).size / 1024).toFixed(1);
console.log(`WebAssembly engine: ${kibibytes} KiB`);

