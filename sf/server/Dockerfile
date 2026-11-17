FROM node:24-bookworm-slim
WORKDIR /app
COPY sf/server/package.json sf/server/package-lock.json ./sf/server/
RUN npm ci --prefix sf/server --omit=dev --ignore-scripts
COPY sf ./sf
COPY index.html new.css explore.html ./
COPY textures ./textures
RUN mkdir -p /app/sf/server/data && chown -R node:node /app/sf/server/data
USER node
WORKDIR /app/sf/server
ENV NODE_ENV=production HOST=0.0.0.0 PORT=8787 STATE_FILE=/app/sf/server/data/world.sqlite
EXPOSE 8787
HEALTHCHECK --interval=30s --start-period=120s --timeout=5s CMD node -e "fetch('http://127.0.0.1:8787/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "index.mjs"]
