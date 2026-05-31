FROM node:20.19-alpine3.22 AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

COPY tsconfig.json ./
COPY src/ ./src/
RUN npm run build && npm prune --omit=dev && npm cache clean --force


FROM node:20.19-alpine3.22 AS runtime

LABEL org.opencontainers.image.title="aimbit-vikunja-mcp" \
      org.opencontainers.image.source="https://github.com/aimbitgmbh/vikunja-mcp" \
      org.opencontainers.image.licenses="MIT"

RUN addgroup -S mcp && adduser -S mcp -G mcp

WORKDIR /app

COPY --from=builder --chown=mcp:mcp /app/dist ./dist
COPY --from=builder --chown=mcp:mcp /app/node_modules ./node_modules
COPY --chown=mcp:mcp package.json ./

USER mcp

ENV NODE_ENV=production \
    PORT=8000

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD wget -qO- http://localhost:8000/health || exit 1

ENTRYPOINT ["node", "dist/index.js"]
