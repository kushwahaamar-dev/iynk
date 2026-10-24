# SimLab room relay. Build context: server/realtime (compose.yaml sets it), so only the relay's own
# files reach the image; server/realtime/.dockerignore narrows it further.
FROM node:24.22.1-alpine

ENV NODE_ENV=production \
    PORT=8787 \
    HOST=0.0.0.0

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund && npm cache clean --force
COPY server.js ./
COPY src ./src

# The code stays root-owned and read-only; the process runs as the image's unprivileged node user.
USER node
EXPOSE 8787
HEALTHCHECK --interval=10s --timeout=3s --start-period=5s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:8787/healthz').then((r) => process.exit(r.ok ? 0 : 1), () => process.exit(1))"]
STOPSIGNAL SIGTERM
CMD ["node", "server.js"]
