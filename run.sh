#!/usr/bin/env bash
set -e
cd "$(dirname "$0")"

if [[ ! -d node_modules ]]; then
  echo "Instalando dependencias..."
  npm install
fi

echo "Iniciando servidor de desarrollo..."
npm run dev
