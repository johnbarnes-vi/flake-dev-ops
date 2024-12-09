{ pkgs }:

{
  # Import and expose both scripts
  manage = import ./manage.nix { inherit pkgs; };
  initEnvironment = import ./init-env.nix { inherit pkgs; };
}