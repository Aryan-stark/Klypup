# Bullseye (Debian 11) ships OpenSSL 1.1.1 which works with MongoDB Atlas.
# Bookworm (Debian 12) ships OpenSSL 3.x whose TLS 1.3 handshake is rejected by Atlas.
FROM python:3.11-slim-bullseye

RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates && rm -rf /var/lib/apt/lists/*

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
