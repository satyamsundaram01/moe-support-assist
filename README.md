# MOE Support Assist

A comprehensive support assistance platform built with a modern microservices architecture.

## Project Structure

This repository is organized as a mono-repo with the following packages:

- `client` - Frontend React application
- `server` - Backend API server
- `mcpserver` - Model Context Protocol server

## Getting Started

### Prerequisites

- Node.js (v20.11 or higher)
- pnpm (v8 or higher)

### Installation

```bash
# Clone the repository
git clone https://github.com/moengage/moe-support-assist.git
cd moe-support-assist

# Install dependencies for all packages
pnpm install
```

### Development

```bash
# Start all services in development mode
pnpm dev

# Or run individual services
pnpm client dev  # Start the frontend
pnpm server dev  # Start the backend server
pnpm mcpserver dev  # Start the MCP server
```

### Building for Production

```bash
# Build all packages
pnpm build

# Or build individual packages
pnpm client build
pnpm server build
pnpm mcpserver build
```

# moe-support-assist
