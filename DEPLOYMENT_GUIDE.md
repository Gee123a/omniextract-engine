# OmniExtract & Shield API - RapidAPI Deployment Guide

## Overview
High-speed zero-customer micro-service built in Bun.
- `POST /v1/extract`: Converts any web URL into clean LLM-ready GFM Markdown with metadata & token estimates.
- `POST /v1/sanitize`: Masks PII (emails, cards, SSNs, API keys) for safe AI ingestion.

Performance:
- **Memory footprint**: ~27 MB RSS.
- **Sanitization latency**: ~0.12 ms (~8,600 req/sec).
- **Extraction latency**: ~190 ms.

---

## Step 1: Deploy Server (2 Minutes)

### Option A: Railway / Render (Zero Configuration)
1. Push this folder to GitHub.
2. Link repo to [Railway.app](https://railway.app) or [Render.com](https://render.com).
3. Railway/Render automatically detects `Dockerfile` and deploys on port 4040.
4. Copy your live URL: `https://your-service.up.railway.app`.

### Option B: Cheap VPS / Cloud VM ($3–$5/mo)
```bash
bun run server.ts
# Or with systemd / pm2:
pm2 start "bun run server.ts" --name omni-api
```

---

## Step 2: Connect to RapidAPI (Zero Customer Management)

1. Open [RapidAPI Provider Dashboard](https://rapidapi.com/provider).
2. Click **Add New API**:
   - Name: `OmniExtract & AI Content Shield`
   - Category: `Data / AI / Web Scraping`
3. Click **Definition** -> **Import OpenAPI** -> Upload `openapi.json`.
4. Set Target Base URL: `https://your-service.up.railway.app`.
5. Configure Pricing Plans:
   - **Basic (Free)**: 50 requests / month.
   - **Pro ($9.99 / mo)**: 2,500 requests ($0.005 / overage).
   - **Ultra ($29.99 / mo)**: 10,000 requests ($0.003 / overage).

---

## Step 3: Payouts & Automated Operation
- RapidAPI generates API keys for buyers automatically.
- RapidAPI handles billing, tax collection, and failed charge retries.
- Payouts transfer directly to your PayPal or bank account monthly.
- Zero customer support tickets required.
