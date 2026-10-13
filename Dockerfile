FROM node:24-bookworm-slim

ENV NODE_ENV=production
WORKDIR /app/apps/systems/aione/backend

RUN apt-get update \
  && apt-get install -y --no-install-recommends unzip imagemagick fonts-noto-cjk \
  && rm -rf /var/lib/apt/lists/*

COPY apps/systems/aione/backend/package.json ./package.json
RUN npm install --omit=dev --no-audit --no-fund

COPY apps/systems/aione/backend/ ./
# The backend's Rakuten candidate/payload services import the single SKU identity
# matcher also used by the frontend. Preserve its real relative module path.
COPY apps/systems/aione/js/services/product-sku-image-identity.js /app/apps/systems/aione/js/services/product-sku-image-identity.js
COPY data-code/migrations/ /app/data-code/migrations/
COPY data-code/current/ /app/data-code/current/

# Design Center preview assets are inert unless AIONE_ENABLE_DESIGN_CENTER_PREVIEW=true.
COPY apps/systems/aione/design-center-v1.html /app/design-center-preview/design-center-v1.html
COPY apps/systems/aione/css/pages/design-center-v1.css /app/design-center-preview/css/pages/design-center-v1.css
COPY apps/systems/aione/js/pages/design-center-v1.js /app/design-center-preview/js/pages/design-center-v1.js
COPY apps/systems/aione/js/services/aione-api-client.js /app/design-center-preview/js/services/aione-api-client.js
COPY apps/systems/aione/pages/design-center/workbench.html /app/design-center-preview/pages/design-center/workbench.html

# Validate the *actual image filesystem* and full server dependency graph.
# This deliberately catches ERR_MODULE_NOT_FOUND during image build, before a
# Cloud Run candidate revision can fail to start and listen on PORT.
RUN node --input-type=module -e "await import('./server.js'); console.log('[AIONE] Docker backend startup/import graph PASS'); process.exit(0)"

EXPOSE 8080
CMD ["npm", "start"]
