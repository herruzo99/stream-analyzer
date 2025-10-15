{
  description = "A Nix flake for the Exhaustive DASH MPD Analyzer frontend application.";
  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixpkgs-unstable";
  };
  outputs = { self, nixpkgs }:
    let
      # A list of systems supported by this flake.
      supportedSystems = [ "x86_64-linux" "aarch64-linux" ];
      # A helper function to generate an attribute set for each supported system.
      forAllSystems = f: nixpkgs.lib.genAttrs supportedSystems (system: f {
        pkgs = import nixpkgs { inherit system; };
      });
    in
    {
      # The default package for each system, which builds the static frontend assets.
      packages = forAllSystems ({ pkgs }: {
        default = pkgs.buildNpmPackage {
          pname = "dash-analyzer-frontend";
          version = "1.0.0";
          src = ./.;
          # NOTE: The npmDepsHash will likely need to be updated after running `npm install`
          # with the new dependencies. Nix will provide the correct hash on a failed build.
          npmDepsHash = "sha256-Vq6713O93o+d53h4Y1m3fS1BjjyX6g0Q+5d0R57545E=";
          
          npmBuild = "npm run build";

          # Install phase for production build
          installPhase = ''
            runHook preInstall
            mkdir -p $out
            cp -r index.html dist $out/
            runHook postInstall
          '';

          # Ensure node_modules/.bin is in the PATH for the build script
          nativeBuildInputs = [ pkgs.nodejs_24 ];
        };
        
        # Separate package for development/testing that includes all dependencies
        dev = pkgs.buildNpmPackage {
          pname = "dash-analyzer-dev";
          version = "1.0.0";
          src = ./.;
          npmDepsHash = "sha256-Vq6713O93o+d53h4Y1m3fS1BjjyX6g0Q+5d0R57545E=";
          
          # Don't run build for dev package, just install dependencies
          dontBuild = true;
          
          installPhase = ''
            runHook preInstall
            mkdir -p $out
            cp -r . $out/
            runHook postInstall
          '';
        };
      });

      # The development shell for each system.
      devShells = forAllSystems ({ pkgs }: {
        default = pkgs.mkShell {
          packages = [ 
            pkgs.nodejs_24
            # Add postcss and tailwindcss CLIs for the build script to work
            pkgs.nodePackages.postcss
            pkgs.tailwindcss_4
            pkgs.watchman
          ];
          
          # Set up Playwright to use Nix-provided browsers
          PLAYWRIGHT_BROWSERS_PATH = "${pkgs.playwright-driver.browsers}";
          PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD = "1";
          
          shellHook = ''
            echo " "
            echo "Welcome to the DASH MPD Analyzer dev shell!"
            echo " "
            echo "To get started:"
            echo "1. Run 'npm install' to fetch project dependencies."
            echo "2. Once dependencies are installed, you can use:"
            echo " - 'npm run build' to create bundles"
            echo " - 'npm run start' to serve locally"
            echo " - 'npm run test' to run all tests"
            echo " - 'npm run lint', 'npm run format', 'npm run typecheck'"
            echo " "
            
            # Add local node_modules/.bin to PATH
            export PATH="$(pwd)/node_modules/.bin:$PATH"
            
            # Ensure Playwright can find browsers
            export PLAYWRIGHT_BROWSERS_PATH="${pkgs.playwright-driver.browsers}"
          '';
        };
      });

      # Test runner app
      apps = forAllSystems ({ pkgs, system }: {
        default = {
          type = "app";
          program = pkgs.writeScriptBin "start-dash-analyzer" ''
            #!${pkgs.bash}/bin/bash
            APP_DIR="${self.packages.${system}.default}"
            echo "Serving DASH MPD Analyzer from $APP_DIR on http://localhost:8000"
            ${pkgs.nodePackages.serve}/bin/serve -p 8000 "$APP_DIR"
          '';
        };
        
        test = {
          type = "app";
          program = pkgs.writeScriptBin "run-tests" ''
            #!${pkgs.bash}/bin/bash
            cd "${self.packages.${system}.dev}"
            export PLAYWRIGHT_BROWSERS_PATH="${pkgs.playwright-driver.browsers}"
            export PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD="1"
            export PATH="$(pwd)/node_modules/.bin:$PATH"
            vitest run
          '';
        };
      });
    };
}