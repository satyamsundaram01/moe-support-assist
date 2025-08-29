# MoeEngage MCP Server

A Model Context Protocol (MCP) server that provides tools and services for MoeEngage platform integration, including Internal Works tools, Redash analytics, and Zendesk support.

## Features

- **IW Tools**: Access MoeEngage Internal Works APIs for app and campaign information
- **Redash Tools**: Query campaign logs across multiple datacenters (DC01, DC02, DC03, DC04)
- **Zendesk Tools**: Fetch support tickets and customer information
- **Environment-based Configuration**: Secure API key management through environment variables
- **Docker Support**: Containerized deployment with health checks
- **Multi-datacenter Support**: Handle different MoeEngage datacenters seamlessly

## Prerequisites

- Node.js >= 20.11.0
- npm or yarn package manager
- Docker (optional, for containerized deployment)

## Installation

1. **Clone the repository and navigate to the mcpserver directory:**
   ```bash
   cd moe-support-assist/mcpserver
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables:**
   ```bash
   cp .env.example .env
   ```

4. **Configure your environment variables in `.env`:**
   ```bash
   # Server Configuration
   PORT=8080
   NODE_ENV=production

   # IW Tools Configuration
   IW_AUTHORIZATION_TOKEN=your_jwt_token_here

   # Redash Tools Configuration
   REDASH_DC01_API_KEY=your_dc01_api_key_here
   REDASH_DC02_API_KEY=your_dc02_api_key_here
   REDASH_DC03_API_KEY=your_dc03_api_key_here
   REDASH_DC04_API_KEY=your_dc04_api_key_here
   REDASH_FALLBACK_API_KEY=your_fallback_api_key_here

   # Zendesk Configuration
   ZENDESK_DOMAIN=your_zendesk_domain.zendesk.com
   ZENDESK_TOKEN=your_zendesk_token_here
   ```

## Usage

### Development Mode
```bash
npm run dev
```

### Production Mode
```bash
npm start
```

### Docker Deployment

1. **Build the Docker image:**
   ```bash
   npm run docker:build
   ```

2. **Run the container:**
   ```bash
   npm run docker:run
   ```

   Or manually:
   ```bash
   docker run --env-file .env -p 8080:8080 moe-mcp-server
   ```

## API Endpoints

- **SSE Endpoint**: `GET /sse` - Server-Sent Events for MCP communication
- **Messages**: `POST /messages` - Handle MCP messages

## Available Tools

### IW Tools
- `get_app_info`: Fetch workspace/database information from MoeEngage
- `get_campaign_info`: Fetch campaign details by campaign ID
- `search_kb`: Search the MoeEngage knowledge base

### Redash Tools
- `get_push_campaign_logs`: Fetch detailed push campaign logs
- `get_whatsapp_campaign_logs`: Fetch WhatsApp campaign logs with granular details
- `get_sent_logs`: Fetch sent logs for all campaign types
- `get_sms_campaign_logs`: Fetch SMS channel specific logs

### Zendesk Tools
- `fetch_zendesk_ticket`: Fetch Zendesk tickets by ticket ID

## Configuration

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `PORT` | Server port (default: 8080) | No |
| `NODE_ENV` | Environment mode | No |
| `IW_AUTHORIZATION_TOKEN` | JWT token for Internal Works API | Yes |
| `REDASH_DC01_API_KEY` | Redash API key for DC01 | Yes |
| `REDASH_DC02_API_KEY` | Redash API key for DC02 | Yes |
| `REDASH_DC03_API_KEY` | Redash API key for DC03 | Yes |
| `REDASH_DC04_API_KEY` | Redash API key for DC04 | Yes |
| `REDASH_FALLBACK_API_KEY` | Fallback Redash API key | Yes |
| `ZENDESK_DOMAIN` | Zendesk domain | Yes |
| `ZENDESK_TOKEN` | Zendesk API token | Yes |

### Datacenter Configuration

The server supports multiple MoeEngage datacenters:
- **DC01**: US East (prod-us-east-1)
- **DC02**: EU Central (prod-eu-central-1)
- **DC03**: AP South (prod-ap-south-1)
- **DC04**: US East 2 (prod-us-east-2-c2)

## Security Features

- Environment variable-based configuration (no hardcoded secrets)
- Non-root user in Docker container
- Health checks for container monitoring
- Input validation using Zod schemas
- CORS configuration for secure cross-origin requests

## Health Check

The server includes a built-in health check endpoint that verifies:
- Server responsiveness
- Port accessibility
- Basic functionality

## Logging

The server uses Winston for structured logging with different log levels:
- `info`: General information
- `debug`: Detailed debugging information
- `error`: Error conditions

## Development

### Project Structure
```
mcpserver/
├── tools/                 # Tool implementations
│   ├── iw-tools/         # Internal Works tools
│   ├── redash-tools/     # Redash analytics tools
│   └── zendesk-tools/    # Zendesk support tools
├── src/                  # Source utilities
├── utils/                # Configuration utilities
├── mcp-server.js         # Main server file
├── package.json          # Dependencies and scripts
├── Dockerfile           # Container configuration
├── .env.example         # Environment template
└── README.md           # This file
```

### Adding New Tools

1. Create a new directory under `tools/`
2. Implement the tool following the existing patterns
3. Register the tool in `tools/index.js`
4. Update configuration files as needed

## Troubleshooting

### Common Issues

1. **Environment Variables Not Loading**
   - Ensure `.env` file exists and is properly formatted
   - Check that all required variables are set

2. **API Authentication Errors**
   - Verify API keys are correct and not expired
   - Check that tokens have proper permissions

3. **Docker Build Issues**
   - Ensure Node.js 20.11+ is available
   - Check that all dependencies are properly installed

4. **Port Conflicts**
   - Change the `PORT` environment variable if 8080 is in use
   - Update Docker port mapping accordingly

## Contributing

1. Follow the existing code structure and patterns
2. Add appropriate error handling and logging
3. Update documentation for new features
4. Test with different datacenter configurations

## License

ISC License - see package.json for details.
