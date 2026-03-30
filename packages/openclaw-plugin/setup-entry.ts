/**
 * Lobster Roll OpenClaw channel plugin — setup entry point
 *
 * Used when OpenClaw loads the plugin in setup-only mode (e.g. during
 * `openclaw channel add`). Only the plugin definition is needed here —
 * no full runtime wiring.
 */
import { defineSetupPluginEntry } from 'openclaw/plugin-sdk/core';
import { lobsterrollPlugin } from './src/channel.js';

export default defineSetupPluginEntry(lobsterrollPlugin);
