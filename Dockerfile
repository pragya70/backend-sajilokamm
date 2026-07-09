FROM node:20-slim AS base

# OpenSSL is required by Prisma's query engine on Debian-based images
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install dependencies (including devDependencies, needed for `prisma generate`)
COPY package.json package-lock.json* .npmrc* ./
RUN npm ci --legacy-peer-deps

# Copy the rest of the source and generate the Prisma client for Linux
COPY . .
RUN npx prisma generate

ENV NODE_ENV=production
EXPOSE 4000

CMD ["node", "server.js"]
