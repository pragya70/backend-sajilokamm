FROM node:20-alpine
WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install --legacy-peer-deps

# Copy source and build
COPY . .
RUN npx prisma generate
RUN npm run build

ENV NODE_ENV=production
# PORT is injected by Koyeb at runtime — server.js reads process.env.PORT
EXPOSE 8000

CMD ["node", "server.js"]
