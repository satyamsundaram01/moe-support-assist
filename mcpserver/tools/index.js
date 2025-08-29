import { registerIWTools } from "./iw-tools/index.js"
import { registerRedashTools } from "./redash-tools/index.js"
import { registerZendeskTools } from "./zendesk-tools/index.js"
import axios from 'axios';

export async function registerAllTools(server) {
  await registerIWTools(server)
  await registerRedashTools(server)
  await registerZendeskTools(server)
}