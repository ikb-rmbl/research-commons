#!/bin/bash
#
# Local Development Setup for Research Commons
#
# Prerequisites:
#   - fnm (Node version manager): brew install fnm
#   - PostgreSQL 17: brew install postgresql@17
#   - pgvector: brew install pgvector
#
# Usage:
#   chmod +x scripts/setup-local.sh
#   ./scripts/setup-local.sh
#

set -e

echo "Research Commons — Local Setup"
echo "================================="
echo ""

# Check prerequisites
echo "Checking prerequisites..."

check_command() {
  if command -v "$1" &> /dev/null; then
    echo "  ✓ $1"
  else
    echo "  ✗ $1 — install with: $2"
    MISSING=true
  fi
}

MISSING=false
check_command "fnm" "brew install fnm"
check_command "psql" "brew install postgresql@17"

if [ "$MISSING" = true ]; then
  echo ""
  echo "Please install missing prerequisites and re-run this script."
  exit 1
fi

# Node.js
echo ""
echo "Setting up Node.js..."
fnm use 22 || fnm install 22
npm install

# Environment file
echo ""
if [ ! -f .env ]; then
  echo "Creating .env from .env.example..."
  cp .env.example .env
  echo "  ✓ .env created — edit it with your settings if needed"
else
  echo "  ✓ .env already exists"
fi

# Database
echo ""
echo "Setting up database..."
if psql -lqt | cut -d \| -f 1 | grep -qw research_commons; then
  echo "  ✓ Database 'research_commons' already exists"
else
  echo "  Creating database 'research_commons'..."
  createdb research_commons
  echo "  ✓ Database created"
fi

# Enable pgvector
echo "  Enabling pgvector extension..."
psql research_commons -c "CREATE EXTENSION IF NOT EXISTS vector;" 2>/dev/null
echo "  ✓ pgvector enabled"

# Payload tables + custom schema in one shot
echo ""
echo "Initializing database schema..."
PAYLOAD_PUSH=true npx tsx scripts/init-db.ts

echo "================================="
echo "Setup complete!"
echo ""
echo "Next steps:"
echo "  1. Edit config/institution.ts — make the portal yours"
echo "  2. Seed publications: npx tsx scripts/import-zotero.ts --group=<id>"
echo "     and/or:            npm run discover"
echo "  3. Start the dev server: npm run dev"
echo "  4. Load discoveries (dev server running): npx tsx scripts/load-to-payload.ts"
echo "  5. Visit http://localhost:3000"
echo ""
