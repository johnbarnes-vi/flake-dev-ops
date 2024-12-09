{ pkgs }:

pkgs.writeScriptBin "init-env" ''
  #!${pkgs.bash}/bin/bash
  
  echo "🏗️  Initializing full-stack development environment..."
  
  # Create project structure
  echo "Creating directory structure..."
  mkdir -p ./sites
  mkdir -p ./nginx/sites-enabled
  mkdir -p ./docker
  
  # Create default nginx configuration
  if [ ! -f ./nginx/default.conf ]; then
    echo "Creating Nginx default configuration..."
    cat > ./nginx/default.conf << 'EOL'
# HTTP redirect for all domains
server {
    listen 80;
    server_name _;
    return 301 https://$host$request_uri;
}

# Include all site configs (path from inside docker container)
include /etc/nginx/conf.d/sites-enabled/*.conf;
EOL
    echo "✅ Created default Nginx configuration"
  else
    echo "ℹ️  Nginx default configuration already exists"
  fi
   
  # Create initial docker-compose.yml using yq directly from nixpkgs
  if [ ! -f ./docker-compose.yml ]; then
    echo "Creating initial docker-compose.yml..."
    cat > ./docker-compose.yml << 'EOL'
version: '3.8'

volumes:
  uploads:

services:
  nginx-proxy:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx:/etc/nginx/conf.d
      - /etc/letsencrypt:/etc/letsencrypt:ro
      - uploads:/var/www/uploads
    depends_on:  # Sites will be added here dynamically
EOL
    echo "✅ Created docker-compose.yml"
  else
    echo "ℹ️  docker-compose.yml already exists"
  fi
  
  echo ""
  echo "🎉 Environment initialization complete!"
  echo "Next steps:"
  echo "1. Run 'manage init [site-name]' to set up a new site"
  echo "2. Run 'manage start-dev [site-name]' to start development servers"
''