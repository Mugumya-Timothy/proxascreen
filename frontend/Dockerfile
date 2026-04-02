FROM node:20-alpine

WORKDIR /app

# Install dependencies (cached layer — only re-runs when package files change)
COPY package*.json ./
RUN npm install

# Copy application source
COPY . .

EXPOSE 5173

# --host 0.0.0.0 makes Vite reachable from outside the container
CMD ["npm", "run", "dev"]
