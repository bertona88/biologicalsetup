import { resolve } from "node:path";
import { defineConfig } from "vite";

export default defineConfig({
  build: {
    target: "es2022",
    rollupOptions: {
      input: {
        lab: resolve(import.meta.dirname, "index.html"),
        references: resolve(import.meta.dirname, "references.html"),
      },
    },
  },
  server: {
    host: "0.0.0.0",
    watch: {
      ignored: ["**/.toolchains/**", "**/target/**", "**/dist/**", "**/prototype/**"],
    },
  },
});
