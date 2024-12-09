{
  description = "Full-stack TypeScript environment with development and production configurations";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-24.05";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = import nixpkgs {
          inherit system;
          config.allowUnfree = true;
        };

        # Production tools - needed for building and running the containerized app
        productionTools = with pkgs; [
          docker
          docker-compose
          nginx
          yq-go # for modifying YAML structure
        ];

        # Development-only tools - needed for local development
        developmentTools = with pkgs; [
          # Node.js and core tools
          nodejs_20
          nodePackages.npm
          nodePackages.typescript-language-server
          nodePackages.ts-node
          nodePackages.nodemon
        ];

        # Import scripts from the scripts directory
        scripts = import ./scripts { inherit pkgs; };

        in
        {
          # Development shell with all tools
          devShells.default = pkgs.mkShell {
            buildInputs = productionTools ++ developmentTools ++ [ 
              scripts.manage
              scripts.initEnvironment
            ];

            shellHook = ''
              echo "🚀 Development environment loaded!"
              
              if [ ! -d "./nginx" ]; then
                echo "First time setup required!"
                echo "Run 'init-env' to create the development environment"
                echo ""
              fi
              
              echo "Available commands:"
              echo "  init-env                      - Initialize development environment"
              echo "  manage init [site-name]       - Initialize site specific files"
              echo "  manage start-prod [site-name] - Start production services"
              echo "  manage stop-prod [site-name]  - Stop production services"
              echo "  manage start-dev [site-name]  - Start development servers"
              echo "  manage build [site-name]      - Build all packages"
              echo "  manage clean [site-name]      - Clean all artifacts"
              echo ""
              echo "Development servers will run on:"
              echo "  Frontend: http://localhost:5173 (default Vite port)"
              echo "  Backend:  http://localhost:5000"
              
              # Setup environment variables
              export DOCKER_BUILDKIT=1
              export COMPOSE_DOCKER_CLI_BUILD=1
            '';
          };

          # Production shell with minimal tools
          devShells.production = pkgs.mkShell {
            buildInputs = productionTools ++ [ 
              scripts.manage
              scripts.initEnvironment
            ];

            shellHook = ''
              echo "🚢 Production environment loaded!"
              echo ""
              echo "Available commands:"
              echo "  manage start-prod [site-name] - Start production services"
              echo "  manage stop-prod [site-name]  - Stop production services"
              
              # Setup environment variables
              export DOCKER_BUILDKIT=1
              export COMPOSE_DOCKER_CLI_BUILD=1
            '';
          };
        }
    );
}