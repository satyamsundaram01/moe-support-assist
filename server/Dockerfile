# ---- Builder Stage ----
# Use a full Python image for building dependencies that may need compilation
FROM python:3.12 AS builder

# Set environment variables
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1

WORKDIR /app

# Install build-time dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

# Create a virtual environment
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Copy only the requirements file first to leverage Docker layer caching
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# ---- Final Stage ----
# Use a slim image for the final, small runtime container
FROM python:3.12-slim

# Set environment variables
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1
ENV PATH="/opt/venv/bin:$PATH"
# The ENVIRONMENT variable should be set by Kubernetes, not here.

WORKDIR /app

# Install only necessary runtime dependencies (e.g., curl for health checks if needed)
# Note: A Python-based health check script would avoid needing curl at all.
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

# Copy the virtual environment from the builder stage
COPY --from=builder /opt/venv /opt/venv

# Copy application code
COPY . .

# Create a non-root user and switch to it for security
RUN useradd --create-home --shell /bin/bash app && \
    chown -R app:app /app

USER app

# Expose port (for documentation and local use)
EXPOSE 8000

# The CMD now uses the "exec form" for graceful shutdowns.
# The number of workers should be passed via a GUNICORN_WORKERS env var from Kubernetes.
# Default to 2 workers if the variable isn't set.
# Run migration before starting the app
CMD ["sh", "-c", "python migrations/migrate.py run && exec gunicorn -w ${GUNICORN_WORKERS:-2} -k uvicorn.workers.UvicornWorker main:app --bind 0.0.0.0:8000"]
