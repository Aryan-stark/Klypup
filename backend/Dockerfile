FROM python:3.12-slim

# Install system-level CA certificates
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Force Python stdout/stderr to flush immediately — prevents log loss on crash
ENV PYTHONUNBUFFERED=1

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt && \
    pip install --no-cache-dir --upgrade certifi

COPY . .

EXPOSE 8000

# Use shell form so $PORT is expanded by the shell (required for Render)
CMD uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}
