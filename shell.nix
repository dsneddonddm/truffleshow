with import (fetchTarball "https://github.com/NixOS/nixpkgs/archive/release-24.11.tar.gz") { };

stdenv.mkDerivation {
  name = "truffleshow";

  buildInputs = with pkgs; [
    nodejs_22
    nodePackages.serve
  ];

  shellHook = ''
  '';
}
