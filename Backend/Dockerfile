FROM node:20-slim

WORKDIR /app

# Install dependencies first (better Docker layer caching)
COPY package*.json ./
RUN npm install --omit=dev

# Copy the rest of the backend source
COPY . .

# Cloud Run injects PORT at runtime; server.js already reads process.env.PORT
ENV NODE_ENV=production

# Cloud Run expects the container to listen on the port it provides via $PORT
EXPOSE 8080

CMD ["node", "server.js"]