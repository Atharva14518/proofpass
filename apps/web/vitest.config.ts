import { defineConfig } from "vitest/config";
import path from "node:path";
export default defineConfig({ test: { environment: "jsdom", setupFiles: ["./test/setup.ts"], exclude: ["e2e/**", "node_modules/**"] }, esbuild: { jsx: "automatic" }, resolve: { alias: { "@": path.resolve(__dirname, ".") } } });
