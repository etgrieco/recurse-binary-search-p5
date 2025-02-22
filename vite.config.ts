import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";

export default defineConfig({
  base: "/recurse-binary-search-p5/",
  resolve: {
    alias: {
      "@fonts": path.resolve(__dirname, "./fonts"),
    },
  },
  plugins: [tailwindcss()],
});
