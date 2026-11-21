FROM node:24-bookworm-slim AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts
COPY server/package.json server/package-lock.json ./server/
RUN npm ci --prefix server --omit=dev --ignore-scripts
COPY . .
RUN npm run build:runtime

FROM node:24-bookworm-slim AS runtime
WORKDIR /app
COPY --from=builder /app/.build/ ./
RUN mkdir -p /app/server/data && chown -R node:node /app/server/data
USER node
WORKDIR /app/server
ENV NODE_ENV=production HOST=0.0.0.0 PORT=8787 STATE_FILE=/app/server/data/world.sqlite
EXPOSE 8787
HEALTHCHECK --interval=30s --start-period=120s --timeout=5s CMD node -e "fetch('http://127.0.0.1:8787/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "--enable-source-maps", "index.mjs"]
