# Build stage
FROM node:lts AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY ./app/package*.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy source code
COPY ./app .

# Production stage
FROM node:lts AS production

# Create app directory
WORKDIR /app

# Create non-root user
# RUN groupadd --gid 1001 nodejs && \
#     useradd --uid 1001 --gid nodejs nodejs && \
#     chown -R nodejs:nodejs /app

# Copy built application from builder stage
COPY --from=builder --chown=node:node /app /app

# Switch to non-root user
USER node

# Set optimized environment variables
ENV NODE_ENV=production

# Start the application
CMD ["npm", "start"]