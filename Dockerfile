# Use Node.js 20 LTS
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies including dev dependencies for build
RUN npm ci --legacy-peer-deps

# Copy source code
COPY . .

# Generate Prisma client using the installed version
RUN npm run prisma:generate

# Build the application
RUN npm run build

# Expose port
EXPOSE 3002

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3002/health || exit 1

# Start the application (NestJS builds src/main.ts to dist/src/main.js)
CMD ["node", "dist/src/main.js"]