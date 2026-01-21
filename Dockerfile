FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY wrangler.toml ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Create non-root user
RUN addgroup -g 1001 -S botmaster && \
    adduser -S botmaster -u 1001

USER botmaster

EXPOSE 8787

CMD ["npm", "start"]
