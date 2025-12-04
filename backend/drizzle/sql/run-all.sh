#!/bin/bash
set -e

echo "🚀 Running all SQL migrations..."

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(dirname "$(dirname "$SCRIPT_DIR")")"

# Load env
cd "$BACKEND_DIR"
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# Check if DATABASE_URL_MIGRATION is set
DB_URL="${DATABASE_URL_MIGRATION:-$DATABASE_URL}"

if [ -z "$DB_URL" ]; then
    echo "❌ DATABASE_URL or DATABASE_URL_MIGRATION not set"
    exit 1
fi

# Run all SQL files in order
for file in "$SCRIPT_DIR"/0*.sql; do
    if [ -f "$file" ]; then
        echo "📄 Running $(basename "$file")..."
        psql "$DB_URL" -f "$file"
    fi
done

echo "✅ All migrations completed!"
