#!/bin/bash
bun run server.ts > server.log 2>&1 &
SERVER_PID=$!
trap "kill $SERVER_PID 2>/dev/null" EXIT

# Wait for server to boot
for i in {1..20}; do
  if curl -s http://localhost:4040/health > /dev/null; then
    break
  fi
  sleep 0.2
done

bun run test_suite.ts
