import { z } from "zod"
import redashService from "./service/redashService.js"
import { loadApiConfig } from "../../utils/configLoader.js"
import path from "path"
import { fileURLToPath } from "url"
import logger from "../../src/utils/logger.js"

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export async function registerRedashTools(server) {
  const configPath = path.join(__dirname, "config.yaml")
  const config = await loadApiConfig(configPath)
  
  if (config.tools) {
    await registerRedashToolsFromConfig(server, config.tools)
  }
}

async function registerRedashToolsFromConfig(server, tools) {
  for (const [name, toolConfig] of Object.entries(tools)) {
    const paramsSchema = {}
    
    if (toolConfig.parameters) {
      for (const param of toolConfig.parameters) {
        if (param.type === 'int') {
          paramsSchema[param.name] = param.required ? z.number() : z.number().optional()
        } else {
          paramsSchema[param.name] = param.required ? z.string() : z.string().optional()
        }
      }
    }

    const toolName = `${name}`

    server.tool(
      toolName,
      toolConfig.description || name,
      paramsSchema,
      async (params) => {
        try {
          const { datacenter, ...queryParams } = params
          
          if (!datacenter) {
            throw new Error('datacenter parameter is required')
          }

          logger.info(`[MCP-REDASH] Invoking tool: ${toolName}`)
          logger.debug(`[MCP-REDASH] Datacenter: ${datacenter}`)
          logger.debug(`[MCP-REDASH] Query Type: ${toolConfig.query_type}`)
          logger.debug(`[MCP-REDASH] Params:`, queryParams)

          // Run the query directly with the provided parameters
          const result = await redashService.runQuery(
            datacenter, 
            toolConfig.query_type, 
            queryParams
          )

          logger.info(`[MCP-REDASH] Query completed successfully`, {
            tool: toolName,
            datacenter,
            total_rows: result.logs?.length || 0
          })

          return { 
            content: [{ 
              type: 'text', 
              text: JSON.stringify(result, null, 2) 
            }] 
          }

        } catch (err) {
          logger.error(`[MCP-REDASH] Error invoking tool ${toolName}:`, err?.message || err)
          if (err?.response) {
            logger.error(`[MCP-REDASH] Error status:`, err.response.status)
            logger.error(`[MCP-REDASH] Error data:`, err.response.data)
          }
          
          // Return error in a structured format
          return {
            content: [{
              type: 'text',
              text: JSON.stringify({
                success: false,
                error: err.message,
                tool: toolName,
                details: err?.response?.data || null
              }, null, 2)
            }]
          }
        }
      }
    )
  }
}