# ⚡ OmniExtract & Shield API

[![Live Demo](https://img.shields.io/badge/Live%20Gateway-Active-success)](https://across-hamilton-medication-connector.trycloudflare.com)
[![OpenAPI](https://img.shields.io/badge/OpenAPI-3.1-blue)](https://across-hamilton-medication-connector.trycloudflare.com/openapi.json)
[![Interactive Docs](https://img.shields.io/badge/Interactive-Swagger%20UI-orange)](https://across-hamilton-medication-connector.trycloudflare.com/docs)
[![Protocol](https://img.shields.io/badge/Micropayments-x402%20Protocol-purple)](https://across-hamilton-medication-connector.trycloudflare.com/llms.txt)

> **High-speed, dual-rail URL-to-Markdown scraper and enterprise PII redaction microservice for AI agents and RAG pipelines.**

---

## 🚀 Live Interactive Demo

- **Swagger UI Interactive Sandbox**: [https://across-hamilton-medication-connector.trycloudflare.com/docs](https://across-hamilton-medication-connector.trycloudflare.com/docs)
- **Agent Discovery (llms.txt)**: [https://across-hamilton-medication-connector.trycloudflare.com/llms.txt](https://across-hamilton-medication-connector.trycloudflare.com/llms.txt)
- **AI Plugin Manifest**: [https://across-hamilton-medication-connector.trycloudflare.com/.well-known/ai-plugin.json](https://across-hamilton-medication-connector.trycloudflare.com/.well-known/ai-plugin.json)

---

## ⚡ Quickstart

### 1. Extract Clean Markdown for LLMs
```bash
curl -X POST "https://across-hamilton-medication-connector.trycloudflare.com/v1/extract" \
  -H "Content-Type: application/json" \
  -H "X-Free-Tier: demo" \
  -d '{"url": "https://example.com"}'
```

### 2. Sanitize Text & Redact PII
```bash
curl -X POST "https://across-hamilton-medication-connector.trycloudflare.com/v1/sanitize" \
  -H "Content-Type: application/json" \
  -H "X-Free-Tier: demo" \
  -d '{"text": "User email: john@corp.com, SSN: 123-45-6789, API Key: sk-proj-12345"}'
```

---

## 🤖 Autonomous Agent-to-Agent (x402) Settlement
This gateway supports RFC HTTP 402 machine-to-machine micropayments. Autonomous agents can call endpoints and settle challenges via Base USDC / Lightning to:
`0xD35f496aF8C73e4205b0Df9424D3aD6935981111`
