# Build stage
FROM node:lts AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --omit=dev && npm cache clean --force

# Copy source code
COPY *.config.js .
COPY /src ./src
COPY /static ./static

# Build front-end app
RUN npm run build

# Production stage
FROM node:lts AS production

# Create app directory
WORKDIR /app

# Copy built application from builder stage
COPY --from=builder --chown=node:node /app /app

# Switch to non-root user
USER node

# Set optimized environment variables
ENV NODE_ENV=production

# Start the application
CMD ["npm", "start"]