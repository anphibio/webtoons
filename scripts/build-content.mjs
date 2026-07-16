import { build } from "esbuild";

await build({
  entryPoints: ["apps/extension/src/content/index.ts"],
  bundle: true,
  format: "iife",
  platform: "browser",
  target: "es2022",
  minify: true,
  outfile: "dist/content.js",
});
