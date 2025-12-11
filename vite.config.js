/**
 * @fileoverview Vite configuration for the sql.js-httpvfs playground.
 * @see https://vitejs.dev/config/
 */

import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";

export default defineConfig({
  base: "/sql.js-httpvfs-playground/",
  plugins: [svelte()],
  optimizeDeps: {
    // Exclude sql.js-httpvfs from pre-bundling as it uses web workers
    exclude: ["sql.js-httpvfs"],
  },
});
