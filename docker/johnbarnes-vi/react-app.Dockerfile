FROM node:20.10.0 as build

WORKDIR /app

# Copy shared module first
COPY shared/package*.json ./shared/
RUN cd shared && npm install

# Copy React app package files
COPY react-app/package*.json ./react-app/
RUN cd react-app && npm install

# Copy source files
COPY shared/ ./shared/
COPY react-app/ ./react-app/

# Build shared module
RUN cd shared && npm run build

# Build React app
RUN cd react-app && npm run build

FROM nginx:alpine
COPY --from=build /app/react-app/dist /usr/share/nginx/html
COPY react-app/nginx.conf /etc/nginx/conf.d/default.conf
CMD ["nginx", "-g", "daemon off;"]
