# --- Stage 1: build the React client ---
FROM node:22-alpine AS client-build
WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci
COPY client/ ./
RUN npm run build

# --- Stage 2: server runtime ---
FROM node:22-alpine
WORKDIR /app/server
COPY server/package*.json ./
RUN npm ci --omit=dev
COPY server/ ./

# Bring in the built client so Express can serve it.
COPY --from=client-build /app/client/dist ../client/dist

ENV PORT=3001
EXPOSE 3001
CMD ["node", "index.js"]
