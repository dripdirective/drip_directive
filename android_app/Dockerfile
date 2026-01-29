# ============================================
# Dripdirective Frontend - Development Dockerfile
# ============================================
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apk add --no-cache git

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --legacy-peer-deps

# Copy application code
COPY . .

# Expose ports (Metro bundler + web)
EXPOSE 8081 19006

# Skip Expo's online dependency validation
ENV EXPO_OFFLINE=1

# Start Expo web
CMD ["npx", "expo", "start", "--web", "--offline"]

