FROM node:20.10.0

WORKDIR /app

# Install Puppeteer dependencies as root
RUN apt-get update && apt-get install -y \
    chromium \
    fonts-ipafont-gothic \
    fonts-wqy-zenhei \
    fonts-thai-tlwg \
    fonts-kacst \
    fonts-symbola \
    fonts-noto \
    fonts-freefont-ttf \
    --no-install-recommends

# Create cache directory with proper permissions
RUN mkdir -p /cache && chown -R node:node /cache

# Set up Node environment as root first
COPY package*.json ./
RUN npm install

# Copy application files
COPY . .

# Change ownership before switching user
RUN chown -R node:node /app

# Switch to non-root user
USER node

# Build application
RUN npm run build

# Environment variables
ENV CHROME_BIN=/usr/bin/chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

EXPOSE 3000
CMD ["npm", "start"]