# Client Docker Setup

This folder contains the client application for Moe Support Assist. Below are instructions for building and running the application using Docker.

## Prerequisites

- Docker and Docker Compose installed on your machine
- Node.js and PNPM installed (for local development)

## Building and Running with Docker

### Option 1: Using Docker Compose (Recommended)

The easiest way to run the application is using Docker Compose, which will build and start all services defined in the docker-compose.yml file.

From the root directory:

```bash
# Build and start all services
docker-compose up -d --build

# View logs
docker-compose logs -f

# Stop all services
docker-compose down
```

### Option 2: Using Docker Directly

If you want to build and run just the client container:

```bash
# Build the image
docker build -t moe-client ./client

# Run the container
docker run -p 3000:80 moe-client
```

The application will be available at http://localhost:3000

## Environment Variables

The following environment variables can be set to configure the application:

- `VITE_API_BASE_URL`: URL of the backend API server
- Add other environment variables as needed

These can be set in the Dockerfile, docker-compose.yml, or passed at runtime.

## Development vs Production

The Dockerfile is optimized for production use. For development, you should run the application locally using:

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev
```

## Customizing Nginx Configuration

The Nginx configuration is located in `nginx.conf`. You can customize this file to:

- Add or modify headers
- Configure caching
- Set up reverse proxying
- And more

After changing the configuration, rebuild the Docker image to apply the changes.

## Troubleshooting

If you encounter issues with the Docker setup:

1. Check the container logs: `docker logs <container_id>`
2. Verify that the ports are correctly mapped
3. Make sure there are no conflicting services running on the same ports
4. Check that environment variables are properly set
