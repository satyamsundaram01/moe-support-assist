# MoEngage Support Agent Server

A configurable support agent server built with Google ADK framework, featuring multi-agent architecture for handling MoEngage customer support queries.

## Features

- **Multi-Agent Architecture**: Specialized agents for different types of support queries
- **Discovery Engine Integration**: Search across documentation, runbooks, and tickets
- **MCP Tool Integration**: External service integration via Model Context Protocol
- **Configurable Environment**: Support for local development and production deployment
- **Database Flexibility**: SQLite for local development, PostgreSQL for production
- **Secure Credential Management**: Environment-based credential handling

## Quick Start

### 1. Environment Setup

Run the interactive setup script:

```bash
python setup_env.py
```

This will guide you through setting up all required environment variables.

### 2. Local Development

```bash
# Install dependencies
pip install -r requirements.txt

# Run the server
python main.py
```

### 3. Docker Development

```bash
# Start with PostgreSQL database
docker-compose up

# Or build and run just the server
docker build -t support-agent .
docker run -p 8080:8080 --env-file .env support-agent
```

## Configuration

### Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `ENVIRONMENT` | Environment (local/production) | local | No |
| `HOST` | Server host | 0.0.0.0 | No |
| `PORT` | Server port | 8080 | No |
| `LOG_LEVEL` | Logging level | INFO | No |
| `DATABASE_URL` | PostgreSQL connection string | - | Yes (production) |
| `SQLITE_PATH` | SQLite database path | local_data/support_agent.db | No (local) |
| `MCP_ENDPOINT` | MCP server endpoint | - | Yes (production) |
| `MCP_LOCAL_ENDPOINT` | Local MCP endpoint | http://localhost:8001 | No (local) |

### Discovery Engine Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `DISCOVERY_ENGINE_PROJECT_ID` | Google Cloud project ID | agent-ai-initiatives |
| `DISCOVERY_ENGINE_LOCATION` | Google Cloud location | us |
| `DISCOVERY_ENGINE_ID` | Discovery Engine ID | app-moe-support-agent-tech_1752497866942 |

### Google Service Account Credentials

Three methods to provide credentials:

1. **Base64 Encoded JSON (Recommended)**:
   ```bash
   GOOGLE_SERVICE_ACCOUNT_BASE64=base64_encoded_json
   ```

2. **Individual Environment Variables**:
   ```bash
   GOOGLE_PROJECT_ID=your_project_id
   GOOGLE_PRIVATE_KEY_ID=your_private_key_id
   GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
   GOOGLE_CLIENT_EMAIL=your_client_email
   GOOGLE_CLIENT_ID=your_client_id
   GOOGLE_CLIENT_X509_CERT_URL=your_cert_url
   ```

3. **Local File Path**:
   ```bash
   GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
   ```

## Architecture

### Agent Structure

- **Root Agent**: `LlmConversationManager` - Routes queries to specialists
- **Knowledge Specialist**: Documentation and how-to queries
- **Technical Specialist**: General technical troubleshooting
- **Push Specialist**: Push notification specific issues
- **WhatsApp Specialist**: WhatsApp campaign specific issues
- **Ticket Specialist**: Zendesk ticket analysis
- **Follow-up Specialist**: Follow-up questions and clarifications

### API Endpoints

- `/health` - Health check endpoint
- `/ask/session` - Create Discovery Engine session
- `/ask/query` - Execute Discovery Engine query
- `/ask/recommendations` - Get ticket recommendations
- `/api/analytics/events` - Store analytics events
- `/api/sessions` - Session management
- `/api/announcements` - Announcement system
- `/api/prompt-library` - Prompt template management

## Development

### Project Structure

```
server/
├── config.py              # Configuration management
├── main.py                # FastAPI application entry point
├── requirements.txt       # Python dependencies
├── Dockerfile            # Docker configuration
├── docker-compose.yml    # Local development setup
├── setup_env.py          # Environment setup script
├── env.example           # Environment variables example
├── .dockerignore         # Docker ignore file
├── moe_support_agent/    # Main agent code
│   ├── agent.py          # Agent orchestration
│   ├── discovery_engine.py # Google Discovery Engine integration
│   ├── specialists/      # Specialist agents
│   ├── ask_mode/         # REST API endpoints
│   └── planner/          # Custom planners
└── local_data/           # Local SQLite database (created at runtime)
```

### Adding New Specialists

1. Create a new specialist file in `moe_support_agent/specialists/`
2. Inherit from `LlmAgent` or `BaseAgent`
3. Add to the specialist list in `agent.py`
4. Update routing logic in conversation managers

### Adding New API Endpoints

1. Create a new router in `moe_support_agent/ask_mode/`
2. Add models to `models.py` if needed
3. Include the router in `main.py`

## Deployment

### Production Deployment

1. Set `ENVIRONMENT=production`
2. Provide all required environment variables
3. Use PostgreSQL database
4. Set up MCP endpoint
5. Configure Google service account credentials

### Docker Deployment

```bash
# Build image
docker build -t support-agent .

# Run with environment variables
docker run -d \
  -p 8080:8080 \
  -e ENVIRONMENT=production \
  -e DATABASE_URL=postgresql://... \
  -e MCP_ENDPOINT=https://... \
  -e GOOGLE_SERVICE_ACCOUNT_BASE64=... \
  support-agent
```

### Kubernetes Deployment

Create a ConfigMap and Secret for environment variables:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: support-agent-config
data:
  ENVIRONMENT: "production"
  HOST: "0.0.0.0"
  PORT: "8080"
  LOG_LEVEL: "INFO"

---
apiVersion: v1
kind: Secret
metadata:
  name: support-agent-secrets
type: Opaque
data:
  DATABASE_URL: <base64-encoded-db-url>
  MCP_ENDPOINT: <base64-encoded-mcp-endpoint>
  GOOGLE_SERVICE_ACCOUNT_BASE64: <base64-encoded-service-account>
```

## Security Considerations

1. **Never commit credentials to version control**
2. **Use environment variables for all sensitive data**
3. **Use base64 encoding for service account JSON in production**
4. **Implement proper CORS configuration**
5. **Use HTTPS in production**
6. **Regularly rotate service account keys**

## Troubleshooting

### Common Issues

1. **Configuration Errors**: Check environment variables with `python setup_env.py`
2. **Database Connection**: Verify database URL and credentials
3. **Discovery Engine**: Ensure service account has proper permissions
4. **MCP Tools**: Verify MCP server is running and accessible

### Health Check

The server provides a health check endpoint at `/health` that returns:

```json
{
  "status": "healthy",
  "environment": "local",
  "database": "connected"
}
```

## Contributing

1. Follow the existing code structure
2. Add proper logging and error handling
3. Update documentation for new features
4. Test with both local and production configurations 