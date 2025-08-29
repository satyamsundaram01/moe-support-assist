import { z } from "zod"
import logger from "../../src/utils/logger.js";
import { makeRequest } from "../../src/utils/request.js";
import { loadApiConfig } from "../../utils/configLoader.js"
import path from "path"
import { fileURLToPath } from "url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export async function registerIWTools(server) {
  const configPath = path.join(__dirname, "config.yaml")
  const config = await loadApiConfig(configPath)
  if (config.apis) {
    registerApiToolsFromConfig(server, config.apis)
  }
}

function registerApiToolsFromConfig(server, apis) {
  for (const [name, api] of Object.entries(apis)) {
    const paramsSchema = {}
    if (api.parameters) {
      for (const param of api.parameters) {
        paramsSchema[param.name] = param.type === 'int' ? z.number() : z.string()
      }
    }
    server.tool(
      name,
      api.description || name,
      paramsSchema,
      async (params) => {
        let url = api.url
        if (api.url_params) {
          for (const [placeholder, paramName] of Object.entries(api.url_params)) {
            if (params[paramName] !== undefined) {
              url = url.replace(`{${placeholder}}`, params[paramName])
            }
          }
        }
        const payload = {}
        if (api.payload_mapping) {
          for (const [k, v] of Object.entries(api.payload_mapping)) {
            payload[k] = typeof v === 'string' && params[v] !== undefined ? params[v] : v
          }
        }
        
        // Process headers and substitute environment variables
        const headers = {}
        if (api.headers) {
          for (const [key, value] of Object.entries(api.headers)) {
            if (typeof value === 'string' && value.startsWith('${') && value.endsWith('}')) {
              const envVar = value.slice(2, -1)
              headers[key] = process.env[envVar] || value
            } else {
              headers[key] = value
            }
          }
        }
        
        let requestConfig = {
          url,
          method: api.method || 'POST',
          headers,
          timeout: api.timeout ? api.timeout * 90000 : 30000
        }
        if (api.method && api.method.toUpperCase() === 'GET' && api.query_mapping) {
          const query = {}
          for (const [k, v] of Object.entries(api.query_mapping)) {
            if (params[v] !== undefined) query[k] = params[v]
          }
          const qs = new URLSearchParams(query).toString()
          if (qs) requestConfig.url += (requestConfig.url.includes('?') ? '&' : '?') + qs
        } else if (Object.keys(payload).length > 0) {
          requestConfig.data = payload
        }
        logger.info(`[MCP-IW] Invoking tool: ${name}`)
        logger.debug(`[MCP-IW] Params:`, params)
        logger.debug(`[MCP-IW] Payload:`, payload)
        logger.debug(`[MCP-IW] Headers:`, headers)
        logger.debug(`[MCP-IW] URL:`, requestConfig.url)
        try {
          const responseData = await makeRequest(requestConfig, name)
          return { content: [{ type: 'text', text: JSON.stringify(responseData) }] }
        } catch (err) {
          logger.error(`[MCP-IW] Error invoking tool ${name}:`, err)
          throw err
        }
      }
    )
  }
}
