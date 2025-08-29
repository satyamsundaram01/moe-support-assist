import dotenv from "dotenv"
import express from "express"
import cors from "cors"
import { randomUUID } from "node:crypto"
import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js"
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js"
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js"
import { z } from "zod"
import { registerAllTools } from "./tools/index.js"

// Load environment variables
dotenv.config()

const app = express()
app.use(express.json())
app.use(cors({
  origin: '*',
  exposedHeaders: ['Mcp-Session-Id'],
  allowedHeaders: ['Content-Type', 'mcp-session-id'],
}))

const transports = {}

app.get('/sse', async (req, res) => {
  // Create SSE transport for legacy clients
  const transport = new SSEServerTransport('/messages', res)
  transports[transport.sessionId] = transport
  res.on("close", () => {
    delete transports[transport.sessionId]
  })

  const server = new McpServer({
    name: "Moengage Mcp Server",
    version: "1.0.0",
  })

  // Register all tools from different modules
  await registerAllTools(server)

  // Register built-in tools
  server.tool(
    "get_utc_today",
    "Returns today's date in UTC in yyyy-mm-dd format.",
    {},
    async () => {
      const now = new Date()
      const yyyy = now.getUTCFullYear()
      const mm = String(now.getUTCMonth() + 1).padStart(2, '0')
      const dd = String(now.getUTCDate()).padStart(2, '0')
      return { content: [{ type: 'text', text: `${yyyy}-${mm}-${dd}` }] }
    }
  )

  // Example: register a resource
  server.registerResource(
    "greeting",
    new ResourceTemplate("greeting://{name}", { list: undefined }),
    {
      title: "Greeting Resource",
      description: "Dynamic greeting generator"
    },
    async (uri, { name }) => ({
      contents: [{ uri: uri.href, text: `Hello, ${name}!` }]
    })
  )
  await server.connect(transport)
})

app.post('/messages', async (req, res) => {
  const sessionId = req.query.sessionId ? String(req.query.sessionId) : undefined
  const transport = transports[sessionId]
  if (transport) {
    await transport.handlePostMessage(req, res, req.body)
  } else {
    res.status(400).send('No transport found for sessionId')
  }
})

const PORT = process.env.PORT || 8080
app.listen(PORT, () => {
  console.log(`SSE MCP server listening on port ${PORT}`)
})
