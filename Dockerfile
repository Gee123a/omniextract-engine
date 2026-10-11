FROM oven/bun:1-alpine
WORKDIR /app
COPY server.ts .
EXPOSE 4040
CMD ["bun", "run", "server.ts"]
