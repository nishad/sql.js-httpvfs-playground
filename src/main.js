/**
 * @fileoverview Application entry point.
 * Initializes the Svelte application and mounts it to the DOM.
 */

import "./app.postcss";
import App from "./App.svelte";
import { mount } from "svelte";

/**
 * Mount the main App component to the DOM.
 * @type {ReturnType<typeof mount>}
 */
const app = mount(App, {
  target: document.getElementById("app"),
});

export default app;
