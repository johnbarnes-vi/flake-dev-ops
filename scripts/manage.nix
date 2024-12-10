{ pkgs }:

# Create the management script using writeScriptBin
pkgs.writeScriptBin "manage" ''
  #!${pkgs.bash}/bin/bash
  
  # Default site name if not provided
  SITE_NAME=''${2:-lonestarstatuary}
  SITE_PATH="sites/$SITE_NAME"
  
  # Function to handle process cleanup
  cleanup() {
    echo -e "\n🛑 Shutting down development servers..."
    # Kill all child processes in the process group
    pkill -P $$
    exit 0
  }

  # Function to check if site exists
  function check_site() {
    if [ ! -d "$SITE_PATH" ]; then
      echo "Error: Site '$SITE_NAME' not found in sites directory"
      exit 1
    fi
  }
  
  # The create_site function contains all the logic for initializing a new site
  function create_site() {
    echo "Creating new site: $SITE_NAME"
    
    # Create base directories
    mkdir -p "$SITE_PATH"/{shared/src/types,server/src,react-app}
    
    # Initialize shared package
    echo "Initializing shared package..."
    cat > "$SITE_PATH/shared/package.json" << EOL
{
  "name": "@$SITE_NAME/shared",
  "version": "1.0.0",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "watch": "tsc -w"
  },
  "devDependencies": {
    "typescript": "~5.6.2"
  }
}
EOL

    # Create shared tsconfig
    cat > "$SITE_PATH/shared/tsconfig.json" << EOL
{
  "compilerOptions": {
    "target": "es2016",
    "module": "commonjs",
    "declaration": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "moduleResolution": "node"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
EOL

    # Create shared type files
    cat > "$SITE_PATH/shared/src/types/user.types.ts" << EOL
export interface User {
  id: string;
  email: string;
  name?: string;
  createdAt: Date;
  updatedAt: Date;
}
EOL

    cat > "$SITE_PATH/shared/src/index.ts" << EOL
/**
 * Shared Resource Export Configuration
 * Bundles all shared resources for both frontend and backend
 */
export * from './types/user.types';
EOL

    # Initialize server
    echo "Initializing server package..."
    cat > "$SITE_PATH/server/package.json" << EOL
{
  "name": "$SITE_NAME-backend",
  "version": "1.0.0",
  "main": "dist/index.js",
  "scripts": {
    "start": "node dist/index.js",
    "build": "tsc",
    "dev": "ts-node-dev --respawn src/index.ts"
  },
  "dependencies": {
    "@$SITE_NAME/shared": "file:../shared",
    "express": "^4.18.2",
    "dotenv": "^16.4.5"
  },
  "devDependencies": {
    "@types/express": "^4.17.21",
    "@types/node": "^20.10.0",
    "ts-node": "^10.9.1",
    "ts-node-dev": "^2.0.0",
    "typescript": "~5.6.2"
  }
}
EOL

    # Create server tsconfig
    cat > "$SITE_PATH/server/tsconfig.json" << EOL
{
  "compilerOptions": {
    "target": "es2016",
    "module": "commonjs",
    "outDir": "./dist",
    "rootDir": "../",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "paths": {
      "@$SITE_NAME/shared": ["../shared/src"]
    }
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
EOL

    # Create basic Express server with placeholder
    cat > "$SITE_PATH/server/src/index.ts" << 'EOL'
import express from 'express';
import { User } from '@SITE_NAME/shared';

const app = express();
const port = process.env.PORT || 5000;

app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy' });
});

app.listen(port, () => {
  console.log('Server running on port ' + port);
});
EOL

    # Replace the placeholder with the actual site name
    sed -i "s/SITE_NAME/$SITE_NAME/g" "$SITE_PATH/server/src/index.ts"

    # Initialize React app with Vite
    echo "Creating React frontend with Vite..."
    npm create vite@latest "$SITE_PATH/react-app" -- --template react-ts
    
    # Update React app's package.json to include shared dependency
    cd "$SITE_PATH/react-app"
    npm pkg set dependencies."@$SITE_NAME/shared"="file:../shared"
    npm install
    npm install -D tailwindcss postcss autoprefixer

    # Initialize Tailwind CSS (creates tailwind.config.js)
    echo "Initializing Tailwind CSS..."
    npx tailwindcss init

    # Create PostCSS config file
    echo "Creating PostCSS configuration..."
    cat > postcss.config.js << EOL
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  }
}
EOL

    # Configure Tailwind CSS with proper template paths
    cat > tailwind.config.js << EOL
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
EOL

    # Create CSS file with Tailwind directives
    echo "Adding Tailwind directives to CSS..."
    cat > src/index.css << 'EOL'
@tailwind base;
@tailwind components;
@tailwind utilities;
EOL

    # Remove unnecessary files and directories
    rm -rf public/vite.svg src/assets src/App.css .gitignore README.md

    # Update index.html to remove Vite references
    cat > index.html << 'EOL'
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>SITE_NAME</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
EOL
    # Replace the placeholder with the actual site name
    sed -i "s/SITE_NAME/$SITE_NAME/g" "index.html"

    # Create App.tsx with Tailwind classes
    cat > src/App.tsx << 'EOL'
//import { User } from '@SITE_NAME/shared';

function App() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900">Welcome to SITE_NAME</h1>
        <p className="mt-4 text-lg text-gray-600">Start building!</p>
      </div>
    </div>
  );
}

export default App;
EOL
    # Replace the placeholder with the actual site name
    sed -i "s/SITE_NAME/$SITE_NAME/g" "src/App.tsx"

    # Create minimal main.tsx
    cat > src/main.tsx << 'EOL'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
EOL
    # Update tsconfig.app.json to include shared module
    cat > tsconfig.app.json << 'EOL'
{
  "compilerOptions": {
    "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.app.tsbuildinfo",
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,

    /* Bundler mode */
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",

    /* Linting */
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedSideEffectImports": true,

    /* Shared Module Path */
    "paths": {
      "@SITE_NAME/shared": ["../shared/src"]
    }
  },
  "include": ["src"]
}
EOL

    # Go back to root
    cd ../../../
    
    # Create Dockerfiles
    echo "Creating Dockerfiles..."
    mkdir -p "docker/$SITE_NAME"
    
    # Backend Dockerfile
    cat > "docker/$SITE_NAME/server.Dockerfile" << EOL
FROM node:20.10.0

WORKDIR /app

# Copy shared module first
COPY shared/package*.json ./shared/
RUN cd shared && npm install

# Copy server package files
COPY server/package*.json ./server/
RUN cd server && npm install

# Copy source files
COPY shared/ ./shared/
COPY server/ ./server/

# Build shared module
RUN cd shared && npm run build

# Build server
RUN cd server && npm run build

EXPOSE 5000
#FIXME: Find correct path for index.js build entry
CMD ["node", "server/dist/server/src/index.js"]
EOL

    # Frontend Dockerfile
    cat > "docker/$SITE_NAME/react-app.Dockerfile" << EOL
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
CMD ["nginx", "-g", "daemon off;"]
EOL

    # Create Nginx configuration
    mkdir -p "nginx/sites-enabled"
    cat > "nginx/sites-enabled/$SITE_NAME.conf" << 'EOL'
# Multi-domain SSL certificate configuration
# Although this site is SITE_NAME.com, we use the certificate at
# /etc/letsencrypt/live/myflashpal.com/ because it's a multi-domain certificate valid for:
# - myflashpal.com
# - www.myflashpal.com
# - ...
# - SITE_NAME.com
# - www.SITE_NAME.com
# The directory name 'myflashpal.com' is just organizational and doesn't affect certificate validity

server {
    listen       443 ssl;
    http2        on;
    server_name  SITE_NAME.com www.SITE_NAME.com;
    
    ssl_certificate /etc/letsencrypt/live/myflashpal.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/myflashpal.com/privkey.pem;

    location / {
        proxy_pass http://SITE_NAME-frontend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /api/ {
        proxy_pass http://SITE_NAME-backend:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Block WordPress scanning attempts
    location ~* ^/(?:wp-admin|wp-login|wordpress|wp-content|wp-includes)/ {
        deny all;
        return 403;  # Return Forbidden instead of 404
        
        # Optional: Add security headers
        add_header X-Robots-Tag "noindex, nofollow" always;
        add_header X-Content-Type-Options "nosniff" always;
    }
}
EOL

    # Now replace SITE_NAME with the actual site name
    sed -i "s/SITE_NAME/$SITE_NAME/g" "nginx/sites-enabled/$SITE_NAME.conf"

    # Function to safely update docker-compose.yml
    update_docker_compose() {
        local SITE_NAME="$1"
        
        # Add frontend service
        ${pkgs.yq-go}/bin/yq -i eval ".services[\"$SITE_NAME-frontend\"] = {
        \"build\": {
            \"context\": \"./sites/$SITE_NAME\",
            \"dockerfile\": \"../../docker/$SITE_NAME/react-app.Dockerfile\"
        },
        \"depends_on\": [\"$SITE_NAME-backend\"]
        }" docker-compose.yml

        # Add backend service
        ${pkgs.yq-go}/bin/yq -i eval ".services[\"$SITE_NAME-backend\"] = {
        \"build\": {
            \"context\": \"./sites/$SITE_NAME\",
            \"dockerfile\": \"../../docker/$SITE_NAME/server.Dockerfile\"
        },
        \"environment\": [\"DOCKER_ENV=true\"],
        \"env_file\": [\"./sites/$SITE_NAME/server/.env\"]
        }" docker-compose.yml

        # Add frontend to nginx-proxy depends_on
        ${pkgs.yq-go}/bin/yq -i eval ".services.nginx-proxy.depends_on += [\"$SITE_NAME-frontend\"]" docker-compose.yml
    }

    # Replace the docker-compose.yml update section in create_site with:
    echo "Updating docker-compose.yml..."
    update_docker_compose "$SITE_NAME"

    # Install dependencies
    echo "Installing dependencies..."
    (cd "$SITE_PATH/shared" && npm install)
    (cd "$SITE_PATH/server" && npm install)
    (cd "$SITE_PATH/react-app" && npm install)

    echo "✅ Site $SITE_NAME has been initialized successfully!"
    echo "Next steps:"
    echo "1. Update environment variables in sites/$SITE_NAME/server/.env"
    echo "2. Run 'manage start-dev $SITE_NAME' to start development servers"
    echo "3. Run 'manage start-prod $SITE_NAME' to start production services"
  }
          
  # Command handling with direct access to Nix package paths
  case "$1" in
    "init")
      create_site
      ;;
      
    "start-prod")
      check_site
      echo "Starting production services..."
      ${pkgs.docker-compose}/bin/docker-compose up --build -d
      ;;
      
    "stop-prod")
      check_site
      echo "Stopping production services..."
      ${pkgs.docker-compose}/bin/docker-compose down
      ;;
      
    "start-dev")
      check_site
      echo "Starting development servers for $SITE_NAME..."

      # Set up process management
      trap cleanup SIGINT SIGTERM

      # Create a directory for log files
      mkdir -p .dev-logs

      # Start frontend dev server
      echo "📦 Starting frontend development server..."
      (cd "$SITE_PATH/react-app" && ${pkgs.nodejs}/bin/npm run dev) > .dev-logs/frontend.log 2>&1 &
      frontend_pid=$!

      # Start backend dev server
      echo "🚀 Starting backend development server..."
      (cd "$SITE_PATH/server" && ${pkgs.nodejs}/bin/npm run dev) > .dev-logs/backend.log 2>&1 &
      backend_pid=$!

      # Function to check if a process is still running
      is_running() {
        kill -0 $1 2>/dev/null
      }

      # Monitor both processes and their logs
      echo -e "\n📋 Development servers are starting..."
      echo "  Frontend logs: .dev-logs/frontend.log"
      echo "  Backend logs: .dev-logs/backend.log"
      echo -e "\n💡 Press Ctrl+C to stop all servers\n"

      # Keep the script running and monitor child processes
      while is_running $frontend_pid || is_running $backend_pid; do
        sleep 1
        
        # Check if either process died unexpectedly
        if ! is_running $frontend_pid; then
          echo "⚠️  Frontend server stopped unexpectedly. Check .dev-logs/frontend.log for details."
          cleanup
        fi
        if ! is_running $backend_pid; then
          echo "⚠️  Backend server stopped unexpectedly. Check .dev-logs/backend.log for details."
          cleanup
        fi
      done
      ;;
      
    "build")
      check_site
      echo "Building all packages for $SITE_NAME..."
      # Build shared package
      cd $SITE_PATH/shared && ${pkgs.nodejs}/bin/npm run build
      # Build server
      cd ../server && ${pkgs.nodejs}/bin/npm run build
      # Build frontend
      cd ../react-app && ${pkgs.nodejs}/bin/npm run build
      ;;
      
    "clean")
      check_site
      echo "Cleaning build artifacts for $SITE_NAME..."
      find "$SITE_PATH" -name "dist" -type d -exec rm -rf {} +
      find "$SITE_PATH" -name "build" -type d -exec rm -rf {} +
      find "$SITE_PATH" -name "node_modules" -type d -exec rm -rf {} +
      ;;
      
    *)
      echo "Usage: manage [command] [site-name]"
      echo "Commands:"
      echo "  init        - Install all dependencies"
      echo "  start-prod  - Start production services via Docker"
      echo "  stop-prod   - Stop production services"
      echo "  start-dev   - Start development servers"
      echo "  build       - Build all packages"
      echo "  clean       - Clean all artifacts and dependencies"
      echo ""
      echo "Site name defaults to 'lonestarstatuary' if not provided"
      ;;
  esac
''