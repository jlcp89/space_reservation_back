###############################
# Backend API Multi-stage Image
# Quick-win improvements applied:
# - Update Node base to current LTS (22)
# - Combine install + cache clean in single layer
# - Use BuildKit cache mount for faster npm ci
# - COPY --chown instead of separate chown layer
# - Minor label additions
# (Optional) Pin digest for reproducibility: replace node:22-alpine with node@sha256:<digest>
###############################

# syntax=docker/dockerfile:1.7

# Build stage
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./
COPY tsconfig.json ./

# Install ALL dependencies (including dev deps for TypeScript) with build cache
# BuildKit required: DOCKER_BUILDKIT=1 (or Docker 23+ default)
RUN --mount=type=cache,target=/root/.npm \
  npm ci && npm cache clean --force

# Copy source code
COPY src ./src

# Build the application
RUN npm run build

# Prune dev dependencies after build (keeps only production deps in node_modules)
RUN npm prune --omit=dev

###############################
# Production stage
###############################
FROM node:22-alpine AS production

# Set environment
ENV NODE_ENV=production

WORKDIR /app

# Add OCI labels (expandable for SBOM / provenance)
LABEL org.opencontainers.image.title="Test1 Backend API" \
  org.opencontainers.image.description="Node.js TypeScript API for workspace reservations" \
  org.opencontainers.image.version="1.0.0" \
  org.opencontainers.image.vendor="YourOrg" \
  org.opencontainers.image.source="https://github.com/yourorg/yourrepo" \
  org.opencontainers.image.licenses="UNLICENSED"

# Copy built application and production dependencies with proper ownership
COPY --chown=node:node --from=builder /app/package*.json ./
COPY --chown=node:node --from=builder /app/node_modules ./node_modules
COPY --chown=node:node --from=builder /app/dist ./dist
USER node

# Expose port
EXPOSE 3000

# Health check (kept Node-based for now; consider curl/wget for lighter process if added)
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (res) => { if (res.statusCode === 200) process.exit(0); process.exit(1); }).on('error', () => { process.exit(1) })"

# Start the application
CMD ["node", "dist/index.js"]