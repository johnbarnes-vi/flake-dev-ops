# docker/prerender/Dockerfile
FROM node:20.10.0

WORKDIR /app

# Install Puppeteer dependencies
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

# Set up Node environment
COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

ENV CHROME_BIN=/usr/bin/chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

EXPOSE 3000
CMD ["npm", "start"]