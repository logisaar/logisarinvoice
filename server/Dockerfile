FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY src/ ./src/
COPY database/ ./database/

# Expose port
EXPOSE 5000

# Start the application
CMD ["node", "src/server.js"]
