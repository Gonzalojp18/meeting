FROM node:18-alpine

WORKDIR /app

# No dependencies to install (no package.json needed for now), 
# but we might add one later if user wants external libs.
# For now, just copy source.

COPY src/ ./src/

# Env vars defaults
ENV HTTP_PORT=2026
ENV CONFIG_DIR=/app/config
ENV OUT_DIR=/app/out
ENV LOG_DIR=/app/logs

# Create persistence directories
RUN mkdir -p /app/config /app/out /app/logs && chown -R node:node /app

USER node

CMD ["node", "src/main.js"]
