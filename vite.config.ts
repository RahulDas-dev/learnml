import path from "path";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

export default defineConfig({
  base: "/learnml/",
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    // No longer a single inlined file: emit hashed, cacheable JS/CSS/font assets
    // and code-split lazy routes for better Core Web Vitals on GitHub Pages.
    reportCompressedSize: false,
    chunkSizeWarningLimit: 1000,
  },
});
