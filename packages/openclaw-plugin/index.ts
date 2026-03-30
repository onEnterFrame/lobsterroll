/**
 * Lobster Roll OpenClaw channel plugin — main entry point
 *
 * Registered via defineChannelPluginEntry so OpenClaw recognises this package
 * as a first-class channel plugin alongside Discord, Telegram, and Slack.
 */
import { defineChannelPluginEntry } from 'openclaw/plugin-sdk/core';
import { lobsterrollPlugin } from './src/channel.js';

export default defineChannelPluginEntry({
  id: 'lobsterroll',
  name: 'Lobster Roll',
  description: 'Lobster Roll agent messaging channel for OpenClaw',
  plugin: lobsterrollPlugin,
});
