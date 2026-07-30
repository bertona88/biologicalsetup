import { existsSync, mkdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const environment = { ...process.env };

// The standard toolchain works unchanged on normal developer machines and CI.
// A constrained runtime without /proc cannot launch Rust's bundled native LLD
// wrapper, so native tests use the system BFD linker there. The WebAssembly
// release build remains unaffected and still uses rust-lld with SIMD enabled.
if (!existsSync("/proc/self/exe")) {
  environment.RUSTFLAGS = [
    environment.RUSTFLAGS,
    "-C link-self-contained=no",
    "-C linker=cc",
    "-C link-arg=-fuse-ld=bfd",
  ]
    .filter(Boolean)
    .join(" ");
  environment.TMPDIR = resolve(root, "target/tmp");
  mkdirSync(environment.TMPDIR, { recursive: true });
}

const result = spawnSync(
  process.env.CARGO || "cargo",
  ["test", "--workspace", "--lib"],
  {
    cwd: root,
    env: environment,
    stdio: "inherit",
  },
);

if (result.error) throw result.error;
process.exit(result.status ?? 1);
