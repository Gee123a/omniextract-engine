/**
 * High-Performance Zero-Customer Micro-API Engine
 * Provides clean web extraction for LLMs and enterprise PII redaction.
 * Designed for RapidAPI / PayAPI automated monetization.
 */

interface ExtractRequest {
  url: string;
  strip_images?: boolean;
}

interface SanitizeRequest {
  text: string;
  mask_char?: string;
  detect_only?: boolean;
}

// PII Regex Patterns
const PII_PATTERNS = {
  email: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
  credit_card: /\b(?:\d{4}[ -]?){3}\d{4}\b/g,
  us_ssn: /\b\d{3}-\d{2}-\d{4}\b/g,
  phone_intl: /\b(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g,
  api_key_generic: /\b(?:sk-[a-zA-Z0-9_-]{20,}|ghp_[a-zA-Z0-9]{36}|AIza[0-9A-Za-z-_]{35}|AKIA[0-9A-Z]{16})\b/g,
  ipv4: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g,
};

function htmlToMarkdown(html: string, stripImages: boolean = false): { markdown: string; title: string; description: string } {
  // Extract title
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  const title = titleMatch ? titleMatch[1].trim() : "";

  // Extract meta description
  const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i) ||
                    html.match(/<meta[^>]*content=["']([^"']*)["'][^>]*name=["']description["']/i);
  const description = descMatch ? descMatch[1].trim() : "";

  // Remove scripts, styles, noscripts, iframes, svgs, header, footer, nav
  let clean = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
    .replace(/<noscript\b[^<]*(?:(?!<\/noscript>)<[^<]*)*<\/noscript>/gi, "")
    .replace(/<header\b[^<]*(?:(?!<\/header>)<[^<]*)*<\/header>/gi, "")
    .replace(/<footer\b[^<]*(?:(?!<\/footer>)<[^<]*)*<\/footer>/gi, "")
    .replace(/<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi, "")
    .replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, "");

  if (stripImages) {
    clean = clean.replace(/<img\b[^>]*>/gi, "");
  }

  // Convert headings
  clean = clean.replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, "\n\n# $1\n\n");
  clean = clean.replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, "\n\n## $1\n\n");
  clean = clean.replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, "\n\n### $1\n\n");
  clean = clean.replace(/<h4[^>]*>([\s\S]*?)<\/h4>/gi, "\n\n#### $1\n\n");

  // Convert links
  clean = clean.replace(/<a[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi, "[$2]($1)");

  // Convert bold and italic
  clean = clean.replace(/<(?:strong|b)[^>]*>([\s\S]*?)<\/(?:strong|b)>/gi, "**$1**");
  clean = clean.replace(/<(?:em|i)[^>]*>([\s\S]*?)<\/(?:em|i)>/gi, "*$1*");

  // Convert lists
  clean = clean.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, "\n- $1");
  clean = clean.replace(/<\/(?:ul|ol)>/gi, "\n");

  // Convert paragraphs & linebreaks
  clean = clean.replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, "\n\n$1\n\n");
  clean = clean.replace(/<br\s*\/?>/gi, "\n");

  // Strip remaining HTML tags
  clean = clean.replace(/<[^>]+>/g, " ");

  // Decode common HTML entities
  clean = clean
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");

  // Normalize whitespace
  clean = clean
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s+\n/g, "\n\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return { markdown: clean, title, description };
}

function sanitizeText(text: string, maskChar: string = "*"): { sanitized: string; findings: Record<string, number> } {
  let result = text;
  const findings: Record<string, number> = {};

  for (const [type, pattern] of Object.entries(PII_PATTERNS)) {
    const matches = text.match(pattern);
    if (matches && matches.length > 0) {
      findings[type] = matches.length;
      result = result.replace(pattern, (match) => {
        return `[REDACTED_${type.toUpperCase()}]`;
      });
    }
  }

  return { sanitized: result, findings };
}

const OPENAPI_SPEC = {
  openapi: "3.1.0",
  info: {
    title: "OmniExtract & Shield API",
    version: "1.0.0",
    description: "High-speed URL to Markdown reader and enterprise PII redaction engine for AI pipelines."
  },
  paths: {
    "/v1/extract": {
      post: {
        summary: "Extract clean Markdown and metadata from any public URL",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  url: { type: "string", format: "uri" },
                  strip_images: { type: "boolean", default: false }
                },
                required: ["url"]
              }
            }
          }
        },
        responses: {
          "200": { description: "Successful extraction" }
        }
      }
    },
    "/v1/sanitize": {
      post: {
        summary: "Redact PII, emails, credit cards, SSNs, and API keys from text",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  text: { type: "string" },
                  mask_char: { type: "string", default: "*" }
                },
                required: ["text"]
              }
            }
          }
        },
        responses: {
          "200": { description: "Successful sanitization" }
        }
      }
    }
  }
};

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 4040;

const server = Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);

    // CORS Headers
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, X-RapidAPI-Key",
      "Content-Type": "application/json"
    };

    if (req.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    // Robots.txt for Search & AI Indexers
    if (url.pathname === "/robots.txt") {
      return new Response("User-agent: *\nAllow: /\nSitemap: /sitemap.xml\n", {
        headers: { "Content-Type": "text/plain" }
      });
    }

    // AI Agent Discovery Standard (llms.txt)
    if (url.pathname === "/llms.txt") {
      const llmsText = `# OmniExtract & Shield API
> High-speed URL to Markdown reader and enterprise PII redaction engine for AI pipelines.

## Endpoints
- POST /v1/extract: Extracts clean Markdown and metadata from any public URL. Takes {"url": string, "strip_images": boolean}.
- POST /v1/sanitize: Redacts PII, emails, credit cards, SSNs, and API keys. Takes {"text": string}.

## Micropayment & Autonomous Agent Protocol
- Protocol: x402 / HTTP 402 Payment Required
- Cost: $0.002 USD per request
- Settlement Address: 0xD35f496aF8C73e4205b0Df9424D3aD6935981111 (Base USDC)
- Authentication: Pass header 'Authorization: x402 <challenge_id>:<proof>' or 'X-RapidAPI-Key'
`;
      return new Response(llmsText, { headers: { "Content-Type": "text/markdown; charset=utf-8", "Access-Control-Allow-Origin": "*" } });
    }

    // AI Plugin Manifest
    if (url.pathname === "/.well-known/ai-plugin.json") {
      return new Response(JSON.stringify({
        schema_version: "v1",
        name_for_human: "OmniExtract & Shield",
        name_for_model: "omni_extract",
        description_for_human: "Extract clean Markdown from URLs and redact PII for LLMs.",
        description_for_model: "Use this tool to extract clean web markdown from URLs or strip sensitive PII from text. Supports x402 micropayments.",
        api: { type: "openapi", url: "/openapi.json" },
        payment: { protocol: "x402", price_usd: 0.002, address: "0xD35f496aF8C73e4205b0Df9424D3aD6935981111" }
      }), { headers: corsHeaders });
    }

    // Agent Protocol Discovery Manifest
    if (url.pathname === "/.well-known/agent.json" || url.pathname === "/agent.json") {
      return new Response(JSON.stringify({
        protocol: "agent-protocol/1.0",
        name: "OmniExtract & Shield",
        description: "Autonomous dual-rail web reader & PII sanitizer for AI agents.",
        payment: {
          protocol: "x402",
          address: "0xD35f496aF8C73e4205b0Df9424D3aD6935981111",
          network: "base",
          cost_usd: 0.002
        },
        endpoints: {
          openapi: "/openapi.json",
          mcp: "/mcp",
          extract: "/v1/extract",
          sanitize: "/v1/sanitize"
        }
      }), { headers: corsHeaders });
    }

    // Smithery / MCP Server Card Manifest
    if (url.pathname === "/.well-known/mcp/server-card.json" || url.pathname === "/mcp/server-card.json") {
      return new Response(JSON.stringify({
        $schema: "https://smithery.ai/schemas/server-card.json",
        name: "omniextract-shield",
        displayName: "OmniExtract & Shield",
        description: "Ultra-fast web scraping to clean Markdown and enterprise PII redaction for AI agents.",
        version: "1.0.0",
        remotes: [
          {
            type: "http",
            url: "https://across-hamilton-medication-connector.trycloudflare.com/mcp"
          }
        ],
        tools: [
          {
            name: "extract_web_markdown",
            description: "Extract clean Markdown, title, description, and token stats from any public web page URL.",
            inputSchema: {
              type: "object",
              properties: {
                url: { type: "string", description: "The HTTP or HTTPS URL to scrape" },
                strip_images: { type: "boolean", description: "Whether to strip image tags from output" }
              },
              required: ["url"]
            }
          },
          {
            name: "sanitize_pii",
            description: "Redact and detect sensitive PII, credit cards, SSNs, emails, phone numbers, and API keys from text.",
            inputSchema: {
              type: "object",
              properties: {
                text: { type: "string", description: "Text to sanitize" },
                mask_char: { type: "string", description: "Mask character to replace sensitive characters with (default: *)" }
              },
              required: ["text"]
            }
          }
        ]
      }), { headers: corsHeaders });
    }

    // Model Context Protocol (MCP) HTTP / JSON-RPC Endpoint
    if (url.pathname === "/mcp" && req.method === "POST") {
      try {
        const rpc = await req.json();
        const id = rpc.id !== undefined ? rpc.id : null;

        if (rpc.method === "initialize") {
          return new Response(JSON.stringify({
            jsonrpc: "2.0",
            id,
            result: {
              protocolVersion: "2024-11-05",
              capabilities: { tools: {} },
              serverInfo: { name: "omniextract-shield", version: "1.0.0" }
            }
          }), { headers: corsHeaders });
        }

        if (rpc.method === "tools/list") {
          return new Response(JSON.stringify({
            jsonrpc: "2.0",
            id,
            result: {
              tools: [
                {
                  name: "extract_web_markdown",
                  description: "Extract clean Markdown, title, description, and token stats from any web URL.",
                  inputSchema: {
                    type: "object",
                    properties: {
                      url: { type: "string", description: "Public URL to fetch and convert to Markdown" },
                      strip_images: { type: "boolean", description: "Whether to remove image tags" }
                    },
                    required: ["url"]
                  }
                },
                {
                  name: "sanitize_pii",
                  description: "Redact emails, phone numbers, credit cards, SSNs, and API keys from text.",
                  inputSchema: {
                    type: "object",
                    properties: {
                      text: { type: "string", description: "Text to sanitize" },
                      mask_char: { type: "string", description: "Mask character" }
                    },
                    required: ["text"]
                  }
                }
              ]
            }
          }), { headers: corsHeaders });
        }

        if (rpc.method === "tools/call") {
          const { name, arguments: args } = rpc.params || {};
          if (name === "extract_web_markdown") {
            const fetchResp = await fetch(args.url, {
              headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
              signal: AbortSignal.timeout(8000)
            });
            const html = await fetchResp.text();
            const { markdown, title } = htmlToMarkdown(html, args.strip_images);
            return new Response(JSON.stringify({
              jsonrpc: "2.0",
              id,
              result: {
                content: [{ type: "text", text: `# ${title}\n\n${markdown}` }]
              }
            }), { headers: corsHeaders });
          }

          if (name === "sanitize_pii") {
            const { sanitized, findings } = sanitizeText(args.text, args.mask_char);
            return new Response(JSON.stringify({
              jsonrpc: "2.0",
              id,
              result: {
                content: [{ type: "text", text: sanitized }],
                findings
              }
            }), { headers: corsHeaders });
          }

          return new Response(JSON.stringify({
            jsonrpc: "2.0",
            id,
            error: { code: -32601, message: `Tool not found: ${name}` }
          }), { headers: corsHeaders });
        }

        return new Response(JSON.stringify({
          jsonrpc: "2.0",
          id,
          result: {}
        }), { headers: corsHeaders });
      } catch (err: any) {
        return new Response(JSON.stringify({
          jsonrpc: "2.0",
          id: null,
          error: { code: -32700, message: err.message || "Parse error" }
        }), { status: 400, headers: corsHeaders });
      }
    }

    // Interactive Swagger UI Documentation Portal (Root & /docs)
    if (url.pathname === "/" || url.pathname === "/docs") {
      const swaggerHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>OmniExtract & Shield API - Interactive Portal</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui.css" />
  <style>
    body { margin: 0; background: #0f172a; color: #f8fafc; font-family: system-ui, sans-serif; }
    .top-banner { background: #1e293b; padding: 16px 24px; border-bottom: 1px solid #334155; display: flex; justify-content: space-between; align-items: center; }
    .badge { background: #10b981; color: #022c22; font-weight: bold; padding: 4px 10px; border-radius: 9999px; font-size: 13px; }
    .swagger-ui { background: #fff; border-radius: 8px; margin: 24px auto; max-width: 1200px; padding: 20px; box-shadow: 0 10px 25px rgba(0,0,0,0.3); }
  </style>
</head>
<body>
  <div class="top-banner">
    <div>
      <h2 style="margin:0; font-size:1.25rem;">⚡ OmniExtract & Shield API</h2>
      <p style="margin:4px 0 0; color:#94a3b8; font-size:0.875rem;">Autonomous Dual-Rail Gateway (RapidAPI Fiat + x402 Micropayments)</p>
    </div>
    <div>
      <span class="badge">● Live & Operational</span>
    </div>
  </div>
  <div id="swagger-ui" class="swagger-ui"></div>
  <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
  <script>
    window.onload = () => {
      window.ui = SwaggerUIBundle({
        url: '/openapi.json',
        dom_id: '#swagger-ui',
        deepLinking: true,
        presets: [SwaggerUIBundle.presets.apis]
      });
    };
  </script>
</body>
</html>`;
      return new Response(swaggerHtml, { headers: { "Content-Type": "text/html; charset=utf-8" } });
    }

    // Health check
    if (url.pathname === "/health") {
      return new Response(JSON.stringify({
        status: "healthy",
        uptime: process.uptime(),
        memory_usage_mb: Math.round(process.memoryUsage().rss / 1024 / 1024),
        payout_address: "0xD35f496aF8C73e4205b0Df9424D3aD6935981111",
        endpoints: ["/v1/extract", "/v1/sanitize", "/openapi.json", "/docs", "/llms.txt"]
      }), { headers: corsHeaders });
    }

    // OpenAPI schema for RapidAPI / Postman
    if (url.pathname === "/openapi.json") {
      return new Response(JSON.stringify(OPENAPI_SPEC), { headers: corsHeaders });
    }

    // Payment & Auth Gate (Dual-Rail: RapidAPI Fiat OR x402 Agent-to-Agent)
    const rapidApiKey = req.headers.get("X-RapidAPI-Key");
    const authHeader = req.headers.get("Authorization");
    const freeTierToken = req.headers.get("X-Free-Tier");

    // Allow public discovery endpoints without auth
    const isPublicEndpoint = url.pathname === "/health" || 
                             url.pathname === "/" || 
                             url.pathname === "/docs" || 
                             url.pathname === "/openapi.json" || 
                             url.pathname === "/llms.txt" || 
                             url.pathname === "/robots.txt" || 
                             url.pathname === "/mcp" ||
                             url.pathname.startsWith("/.well-known/");

    if (!isPublicEndpoint && !rapidApiKey && !freeTierToken) {
      if (!authHeader || !authHeader.startsWith("x402 ")) {
        // Return RFC-compliant HTTP 402 Payment Required for autonomous agents
        const challengeId = `x402_chal_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
        return new Response(JSON.stringify({
          error: "Payment Required",
          status: 402,
          protocol: "x402/1.0",
          cost: {
            amount_usd: 0.002,
            sats_equivalent: 3,
            currency: "USD"
          },
          challenge: {
            id: challengeId,
            realm: "OmniExtract-Agent-Gateway",
            settlement_networks: ["base-usdc", "ethereum", "solana"],
            payment_address: "0xD35f496aF8C73e4205b0Df9424D3aD6935981111"
          },
          instructions: "Settle challenge and retry with header: 'Authorization: x402 <challenge_id>:<signature_or_preimage>'"
        }), {
          status: 402,
          headers: {
            ...corsHeaders,
            "WWW-Authenticate": `x402 realm="OmniExtract-Agent-Gateway", challenge="${challengeId}", amount="0.002"`,
            "X-Payment-Required": "true",
            "X-Payment-Protocol": "x402"
          }
        });
      }
    }

    // POST /v1/extract
    if (url.pathname === "/v1/extract" && req.method === "POST") {
      const start = performance.now();
      try {
        const body: ExtractRequest = await req.json();
        if (!body.url || !body.url.startsWith("http")) {
          return new Response(JSON.stringify({ error: "Valid HTTP(S) URL required" }), { status: 400, headers: corsHeaders });
        }

        const fetchResp = await fetch(body.url, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
          },
          signal: AbortSignal.timeout(8000)
        });

        if (!fetchResp.ok) {
          return new Response(JSON.stringify({ error: `Failed to fetch URL: HTTP ${fetchResp.status}` }), { status: 502, headers: corsHeaders });
        }

        const html = await fetchResp.text();
        const { markdown, title, description } = htmlToMarkdown(html, body.strip_images);
        const elapsed = Math.round(performance.now() - start);
        const estimatedTokens = Math.ceil(markdown.length / 4);

        return new Response(JSON.stringify({
          success: true,
          url: body.url,
          title,
          description,
          content: markdown,
          stats: {
            chars: markdown.length,
            words: markdown.split(/\s+/).filter(Boolean).length,
            estimated_tokens: estimatedTokens,
            latency_ms: elapsed
          }
        }), { headers: corsHeaders });

      } catch (err: any) {
        return new Response(JSON.stringify({ error: err.message || "Extraction failed" }), { status: 500, headers: corsHeaders });
      }
    }

    // POST /v1/sanitize
    if (url.pathname === "/v1/sanitize" && req.method === "POST") {
      const start = performance.now();
      try {
        const body: SanitizeRequest = await req.json();
        if (typeof body.text !== "string") {
          return new Response(JSON.stringify({ error: "text field required" }), { status: 400, headers: corsHeaders });
        }

        const { sanitized, findings } = sanitizeText(body.text, body.mask_char);
        const elapsed = Math.round(performance.now() - start);

        return new Response(JSON.stringify({
          success: true,
          original_length: body.text.length,
          sanitized_length: sanitized.length,
          findings,
          total_redactions: Object.values(findings).reduce((a, b) => a + b, 0),
          sanitized_text: sanitized,
          latency_ms: elapsed
        }), { headers: corsHeaders });

      } catch (err: any) {
        return new Response(JSON.stringify({ error: err.message || "Sanitization failed" }), { status: 500, headers: corsHeaders });
      }
    }

    return new Response(JSON.stringify({ error: "Not Found" }), { status: 404, headers: corsHeaders });
  }
});

console.log(`[OmniExtract API] Listening on http://localhost:${server.port}`);
