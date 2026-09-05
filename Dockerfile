# ==============================================================================
# Multi-Stage Dockerfile for RailFlow (SIH26027)
# Stage 1: Build & Dependency Compiler
# ==============================================================================
FROM python:3.12-slim AS builder

WORKDIR /build

# Install build dependencies for compiling C/C++ extensions
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    gcc \
    g++ \
    libsqlite3-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Create virtual environment
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Upgrade pip, setuptools, wheel
RUN pip install --no-cache-dir --upgrade pip setuptools wheel

# Install pinned enterprise dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# ==============================================================================
# Stage 2: Production Minimal Runtime
# ==============================================================================
FROM python:3.12-slim AS runner

WORKDIR /app

# Install runtime utilities only
RUN apt-get update && apt-get install -y --no-install-recommends \
    sqlite3 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy virtual environment from builder stage
COPY --from=builder /opt/venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Environment configuration
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    STREAMLIT_SERVER_PORT=8501 \
    STREAMLIT_SERVER_HEADLESS=true \
    STREAMLIT_SERVER_ENABLE_CORS=false \
    STREAMLIT_SERVER_ENABLE_XSRF_PROTECTION=false \
    PORT=8501

# Create non-root system user for security
RUN groupadd -g 1000 appuser && \
    useradd -u 1000 -g appuser -s /bin/bash -m appuser

# Copy application source files
COPY --chown=appuser:appuser . /app

# Ensure directories for SQLite data and output exist with proper permissions
RUN mkdir -p /app/data /app/out && \
    chown -R appuser:appuser /app

# Switch to non-root user
USER appuser

# Expose Streamlit cockpit (8501) and FastAPI backend (8000)
EXPOSE 8501 8000

# Health check using Streamlit health endpoint
HEALTHCHECK --interval=30s --timeout=10s --retries=3 --start-period=15s \
    CMD curl -f http://localhost:8501/_stcore/health || exit 1

# Default command: launch Streamlit advisory cockpit
CMD ["streamlit", "run", "cockpit/app.py", "--server.port=8501", "--server.address=0.0.0.0"]
