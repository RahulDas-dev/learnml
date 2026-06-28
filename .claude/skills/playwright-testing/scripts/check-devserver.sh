#!/bin/bash
# Check if development server is running
# Usage: ./check-devserver.sh [port]

# Default ports to check
PORTS="${1:-3000 3001 5173 8080 4200 8000}"

echo "🔍 Checking for running dev servers..."
echo ""

found=false

for port in $PORTS; do
  if lsof -i :$port -sTCP:LISTEN > /dev/null 2>&1; then
    process=$(lsof -i :$port -sTCP:LISTEN | tail -1 | awk '{print $1}')
    echo "✅ Port $port: RUNNING ($process)"
    echo "   URL: http://localhost:$port"
    found=true
  fi
done

if [ "$found" = false ]; then
  echo "❌ No dev server found on ports: $PORTS"
  echo ""
  echo "Start your dev server:"
  echo "  Next.js:  pnpm run dev"
  echo "  Vite:     pnpm run dev"
  echo "  Python:   uv run uvicorn app:app --reload"
  exit 1
fi

echo ""
echo "💡 Use the URL above for browser_navigate()"