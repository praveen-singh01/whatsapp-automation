# Use Node.js 18 LTS as base image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Install system dependencies for Sharp and image processing
RUN apk add --no-cache \
    vips-dev \
    python3 \
    make \
    g++ \
    libc6-compat \
    curl

# Copy package files first for better Docker layer caching
COPY package*.json ./

# Install dependencies with production optimizations
RUN npm ci --only=production && npm cache clean --force

# Copy application code
COPY . .

# Create public directory for file uploads and temp files
RUN mkdir -p public temp

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001 -G nodejs

# Change ownership of the app directory
RUN chown -R nextjs:nodejs /app

# Switch to non-root user
USER nextjs

# Expose port (Railway will set PORT environment variable)
EXPOSE 3000

# Health check for Railway deployment monitoring
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD curl -f http://localhost:${PORT:-3000}/health || exit 1

# Start the application
CMD ["node", "app.js"]
