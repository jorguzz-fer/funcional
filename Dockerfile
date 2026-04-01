# === Stage 1: Build Client ===
FROM node:20-alpine AS client-build
WORKDIR /app/client
COPY client/package.json client/package-lock.json* ./
RUN npm install
COPY client/ ./
RUN npm run build

# === Stage 2: Build Server ===
FROM node:20-alpine AS server-build
WORKDIR /app/server
COPY server/package.json server/package-lock.json* ./
RUN npm install
COPY server/ ./
RUN npx prisma generate
RUN npx tsc || true

# === Stage 3: Production ===
FROM node:20-alpine AS production
WORKDIR /app

# Install production deps for server
COPY server/package.json server/package-lock.json* ./server/
RUN cd server && npm install --omit=dev

# Copy prisma schema + generated client
COPY server/prisma ./server/prisma
RUN cd server && npx prisma generate

# Copy compiled server
COPY --from=server-build /app/server/dist ./server/dist

# Copy built client
COPY --from=client-build /app/client/dist ./client/dist

# Install serve for static files
RUN npm install -g serve

# Copy entrypoint
COPY entrypoint.sh ./
RUN chmod +x entrypoint.sh

EXPOSE 3001 5173

CMD ["./entrypoint.sh"]
