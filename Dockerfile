FROM node:24-bookworm-slim

ENV NODE_ENV=production
WORKDIR /app/apps/systems/aione/backend

RUN apt-get update \
  && apt-get install -y --no-install-recommends unzip imagemagick fonts-noto-cjk \
  && rm -rf /var/lib/apt/lists/*

COPY apps/systems/aione/backend/package.json ./package.json
RUN npm install --omit=dev --no-audit --no-fund

COPY apps/systems/aione/backend/ ./
COPY data-code/migrations/ /app/data-code/migrations/
COPY data-code/current/ /app/data-code/current/

EXPOSE 8080
CMD ["npm", "start"]
