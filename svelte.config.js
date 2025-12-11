/**
 * @fileoverview Svelte configuration for the sql.js-httpvfs playground.
 * @see https://svelte.dev/docs/kit/configuration
 */

import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";

/** @type {import('@sveltejs/vite-plugin-svelte').SvelteConfig} */
const config = {
  preprocess: [vitePreprocess()],
};

export default config;
