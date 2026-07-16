import { resolve } from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  root: resolve(__dirname, "apps/extension"),
  plugins: [react()],
  build: {
    outDir: resolve(__dirname, "dist"),
    emptyOutDir: true,
    rollupOptions: {
      input: {
        popup: resolve(__dirname, "apps/extension/popup.html"),
        options: resolve(__dirname, "apps/extension/options.html"),
        background: resolve(__dirname, "apps/extension/src/background/index.ts"),
        content: resolve(__dirname, "apps/extension/src/content/index.ts"),
        ocr: resolve(__dirname, "apps/extension/ocr.html"),
      },
      output: {
        entryFileNames: "[name].js",
        chunkFileNames: "chunks/[name]-[hash].js",
        assetFileNames: "assets/[name]-[hash][extname]",
      },
    },
  },
});
