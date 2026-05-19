FROM python:3.12-slim

# Install CA certs and patch OpenSSL config to cap TLS at 1.2
# (Python 3.12 / OpenSSL 3.x sends TLS 1.3 ClientHello that MongoDB Atlas rejects)
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/* \
    && python3 -c "
content = open('/etc/ssl/openssl.cnf').read()
patch = content.replace(
    '[system_default_sect]',
    '[system_default_sect]\nMaxProtocol = TLSv1.2\nCipherString = DEFAULT@SECLEVEL=1'
)
open('/etc/ssl/openssl.cnf', 'w').write(patch)
print('OpenSSL patched:', 'MaxProtocol' in patch)
"

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
