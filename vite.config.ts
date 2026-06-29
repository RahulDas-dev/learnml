import path from "path";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

export default defineConfig({
  base: "/learnml/",
  plugins: [react(), tailwindcss(), viteSingleFile()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    assetsInlineLimit: 10000000000,
    cssCodeSplit: false,
    reportCompressedSize: false,
    chunkSizeWarningLimit: 1000,
    rolldownOptions: {
      output: {
        manualChunks: undefined,
      },
    },
  },
});