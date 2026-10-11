#!/bin/bash
set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DIR"

# Kill existing instances if running
pkill -f "bun run server.ts" 2>/dev/null || true
pkill -f "cloudflared tunnel" 2>/dev/null || true
sleep 1

echo "Starting OmniExtract API on port 4040..."
nohup bun run server.ts > "$DIR/api.log" 2>&1 &
API_PID=$!
echo "API PID: $API_PID"

# Wait for local health check
for i in {1..20}; do
  if curl -s http://localhost:4040/health > /dev/null; then
    echo "API server healthy on http://localhost:4040"
    break
  fi
  sleep 0.2
done

echo "Starting Cloudflare Public Tunnel..."
rm -f "$DIR/tunnel.log"
nohup /opt/homebrew/bin/cloudflared tunnel --url http://localhost:4040 > "$DIR/tunnel.log" 2>&1 &
TUNNEL_PID=$!
echo "Tunnel PID: $TUNNEL_PID"

# Extract public URL from tunnel log
PUBLIC_URL=""
for i in {1..30}; do
  PUBLIC_URL=$(grep -oE 'https://[a-zA-Z0-9-]+\.trycloudflare\.com' "$DIR/tunnel.log" | head -n 1 || true)
  if [ -n "$PUBLIC_URL" ]; then
    break
  fi
  sleep 0.5
done

if [ -z "$PUBLIC_URL" ]; then
  echo "Failed to extract Cloudflare tunnel URL. Check tunnel.log:"
  cat "$DIR/tunnel.log"
  exit 1
fi

echo ""
echo "=========================================================="
echo "LIVE PUBLIC URL: $PUBLIC_URL"
echo "=========================================================="
echo "$PUBLIC_URL" > "$DIR/public_url.txt"

# Update openapi.json with live public URL
bun -e '
const url = await Bun.file("public_url.txt").text();
const spec = await Bun.file("openapi.json").json();
spec.servers = [{ url: url.trim(), description: "Live Cloudflare Edge Gateway" }];
await Bun.write("openapi.json", JSON.stringify(spec, null, 2));
'

echo "OpenAPI schema updated with live URL."
