# Production image for the API and the Python engine it runs.
# Build context: the repository root, because the API also needs
# analysis-engine/ and sample-data/.

FROM node:22-bookworm AS build
WORKDIR /app/backend
COPY backend/package.json backend/package-lock.json ./
RUN npm ci
COPY backend/ ./
RUN npm run build && npm prune --omit=dev

FROM node:22-bookworm-slim
# Debian bookworm ships Python 3.11, which the engine requires.
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 python3-venv \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app/analysis-engine
COPY analysis-engine/requirements.txt ./
RUN python3 -m venv .venv && .venv/bin/pip install --no-cache-dir -r requirements.txt
COPY analysis-engine/profile_dataset.py ./
COPY analysis-engine/eda ./eda
COPY sample-data/*.csv /app/sample-data/

WORKDIR /app/backend
COPY --from=build /app/backend/package.json ./
COPY --from=build /app/backend/node_modules ./node_modules
COPY --from=build /app/backend/dist ./dist
# The app only writes to uploads/. Changing the owner of anything else would
# copy every file into a new image layer.
RUN mkdir -p uploads && chown node:node uploads

ENV NODE_ENV=production \
  PORT=5000 \
  PYTHON_BIN=../analysis-engine/.venv/bin/python \
  ANALYSIS_SCRIPT_PATH=../analysis-engine/profile_dataset.py \
  SAMPLE_DATA_DIR=../sample-data
USER node
EXPOSE 5000
CMD ["node", "dist/server.js"]
