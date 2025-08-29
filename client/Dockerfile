FROM node:20-slim AS base

# Set working directory
WORKDIR /app

# Add pnpm package manager
RUN corepack enable && corepack prepare pnpm@latest --activate

# First stage: Dependencies
FROM base AS deps
# Copy package.json and related files
COPY package.json pnpm-lock.yaml ./

# Install dependencies (using frozen lockfile for consistency)
RUN pnpm install --frozen-lockfile --prod=false

# Second stage: Builder
FROM base AS builder
WORKDIR /app

# Define build arguments with default values
ARG VITE_OKTA_CLIENT_ID
ARG VITE_OKTA_ISSUER=https://moengageinc.oktapreview.com
ARG VITE_OKTA_REDIRECT_URI=http://localhost:5173/login/callback
ARG VITE_ZENDESK_DOMAIN=moengage
ARG VITE_ZENDESK_API_TOKEN
ARG VITE_ZENDESK_EMAIL
ARG VITE_ZENDESK_SUBDOMAIN=moengage.zendesk.com
ARG VITE_STORAGE_API_BASE_URL=http://localhost:8001
ARG VITE_API_BASE_URL=http://10.66.66.221:8000

# Copy node_modules from deps stage
COPY --from=deps /app/node_modules ./node_modules
# Copy the rest of the application
COPY . .

# Convert build arguments to environment variables for the build process
ENV NODE_ENV=production
ENV VITE_OKTA_CLIENT_ID=$VITE_OKTA_CLIENT_ID
ENV VITE_OKTA_ISSUER=$VITE_OKTA_ISSUER
ENV VITE_OKTA_REDIRECT_URI=$VITE_OKTA_REDIRECT_URI
ENV VITE_ZENDESK_DOMAIN=$VITE_ZENDESK_DOMAIN
ENV VITE_ZENDESK_API_TOKEN=$VITE_ZENDESK_API_TOKEN
ENV VITE_ZENDESK_EMAIL=$VITE_ZENDESK_EMAIL
ENV VITE_ZENDESK_SUBDOMAIN=$VITE_ZENDESK_SUBDOMAIN
ENV VITE_STORAGE_API_BASE_URL=$VITE_STORAGE_API_BASE_URL
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

# Build the application
RUN pnpm build

# Final stage: Runner
FROM nginx:alpine AS runner
WORKDIR /usr/share/nginx/html

# Copy built assets from builder stage
COPY --from=builder /app/dist .
# Copy nginx configuration
COPY --from=builder /app/nginx.conf /etc/nginx/conf.d/default.conf

# Expose port
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
