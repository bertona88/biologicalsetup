import assert from "node:assert/strict";
import { resolve } from "node:path";
import { createServer } from "vite";

const root = resolve(import.meta.dirname, "..");
const server = await createServer({
  root,
  logLevel: "silent",
  server: {
    host: "127.0.0.1",
    port: 4173,
    strictPort: true,
    watch: null,
  },
});

try {
  await server.listen();
  for (const [path, contentType] of [
    ["/", "text/html"],
    ["/references.html", "text/html"],
    ["/biological_engine.wasm", "application/wasm"],
  ]) {
    const response = await fetch(`http://127.0.0.1:4173${path}`);
    assert.equal(response.status, 200, `${path} should be served`);
    assert.match(
      response.headers.get("content-type") ?? "",
      new RegExp(contentType),
      `${path} should have ${contentType} content type`,
    );
  }
  console.log("HTTP smoke: lab, references, and WebAssembly served correctly.");
} finally {
  await server.close();
}
