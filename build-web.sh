#!/usr/bin/env bash
# O app é JavaScript puro (sem bundler): basta publicar index.html + src/.
set -e
cd "$(dirname "$0")"
rm -rf dist
mkdir -p dist
cp index.html dist/index.html
cp -r src dist/src
echo "dist pronto:"
find dist -type f | sort
