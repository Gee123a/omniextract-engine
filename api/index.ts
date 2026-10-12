/**
 * Vercel Serverless / Edge Gateway for OmniExtract & Shield
 * Runs 24/7 in cloud on Vercel Global Edge Network.
 */

export const config = {
  runtime: 'edge',
};

interface ExtractRequest {
  url: string;
  strip_images?: boolean;
}

interface SanitizeRequest {
  text: string;
  mask_char?: string;
  detect_only?: boolean;
}

const PII_PATTERNS = {
  email: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
  credit_card: /\b(?:\d{4}[ -]?){3}\d{4}\b/g,
  us_ssn: /\b\d{3}-\d{2}-\d{4}\b/g,
  phone_intl: /\b(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g,
  api_key_generic: /\b(?:sk-[a-zA-Z0-9_-]{20,}|ghp_[a-zA-Z0-9]{36}|AIza[0-9A-Za-z-_]{35}|AKIA[0-9A-Z]{16})\b/g,
  ipv4: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g,
};

function htmlToMarkdown(html: string, stripImages: boolean = false): { markdown: string; title: string; description: string } {
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  const title = titleMatch ? titleMatch[1].trim() : "";

  const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i) ||
                    html.match(/<meta[^>]*content=["']([^"']*)["'][^>]*name=["']description["']/i);
  const description = descMatch ? descMatch[1].trim() : "";

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

  clean = clean.replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, "\n\n# $1\n\n");
  clean = clean.replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, "\n\n## $1\n\n");
  clean = clean.replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, "\n\n### $1\n\n");
  clean = clean.replace(/<h4[^>]*>([\s\S]*?)<\/h4>/gi, "\n\n#### $1\n\n");
  clean = clean.replace(/<a[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi, "[$2]($1)");
  clean = clean.replace(/<(?:strong|b)[^>]*>([\s\S]*?)<\/(?:strong|b)>/gi, "**$1**");
  clean = clean.replace(/<(?:em|i)[^>]*>([\s\S]*?)<\/(?:em|i)>/gi, "*$1*");
  clean = clean.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, "\n- $1");
  clean = clean.replace(/<\/(?:ul|ol)>/gi, "\n");
  clean = clean.replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, "\n\n$1\n\n");
  clean = clean.replace(/<br\s*\/?>/gi, "\n");
  clean = clean.replace(/<[^>]+>/g, " ");

  clean = clean
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
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
    if (matches) {
      findings[type] = matches.length;
      result = result.replace(pattern, (m) => `[REDACTED_${type.toUpperCase()}]`);
    } else {
      findings[type] = 0;
    }
  }

  return { sanitized: result, findings };
}

export default async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url);

  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-RapidAPI-Key, X-RapidAPI-Proxy-Secret",
    "Content-Type": "application/json"
  };

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Health
  if (url.pathname === "/health") {
    return new Response(JSON.stringify({
      status: "healthy",
      platform: "vercel-edge",
      payout_address: "0xD35f496aF8C73e4205b0Df9424D3aD6935981111",
      endpoints: ["/v1/extract", "/v1/sanitize", "/openapi.json", "/docs"]
    }), { headers: corsHeaders });
  }

  // Root & Docs
  if (url.pathname === "/" || url.pathname === "/docs") {
    const swaggerHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>OmniExtract & Shield API (Cloud 24/7)</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui.css" />
  <style>
    body { margin: 0; background: #0f172a; color: #f8fafc; font-family: system-ui, sans-serif; }
    .top-banner { background: #1e293b; padding: 16px 24px; border-bottom: 1px solid #334155; display: flex; justify-content: space-between; align-items: center; }
    .badge { background: #10b981; color: #022c22; font-weight: bold; padding: 4px 10px; border-radius: 9999px; font-size: 13px; }
    .swagger-ui { background: #fff; border-radius: 8px; margin: 24px auto; max-width: 1200px; padding: 20px; }
  </style>
</head>
<body>
  <div class="top-banner">
    <div>
      <h2 style="margin:0; font-size:1.25rem;">⚡ OmniExtract & Shield API (Cloud Edge 24/7)</h2>
      <p style="margin:4px 0 0; color:#94a3b8; font-size:0.875rem;">Autonomous Dual-Rail Gateway (RapidAPI Fiat + x402 Micropayments)</p>
    </div>
    <div><span class="badge">● Live 24/7 in Cloud</span></div>
  </div>
  <div id="swagger-ui" class="swagger-ui"></div>
  <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
  <script>
    window.onload = () => {
      window.ui = SwaggerUIBundle({ url: '/openapi.json', dom_id: '#swagger-ui' });
    };
  </script>
</body>
</html>`;
    return new Response(swaggerHtml, { headers: { "Content-Type": "text/html; charset=utf-8" } });
  }

  // OpenAPI
  if (url.pathname === "/openapi.json") {
    return new Response(JSON.stringify({
      openapi: "3.1.0",
      info: {
        title: "OmniExtract & Shield API",
        version: "1.0.0",
        description: "Cloud 24/7 URL to Markdown and enterprise PII redaction engine."
      },
      paths: {
        "/v1/extract": {
          post: {
            summary: "Extract clean Markdown from URL",
            requestBody: {
              required: true,
              content: { "application/json": { schema: { type: "object", properties: { url: { type: "string" } }, required: ["url"] } } }
            },
            responses: { "200": { description: "Success" } }
          }
        },
        "/v1/sanitize": {
          post: {
            summary: "Redact PII from text",
            requestBody: {
              required: true,
              content: { "application/json": { schema: { type: "object", properties: { text: { type: "string" } }, required: ["text"] } } }
            },
            responses: { "200": { description: "Success" } }
          }
        }
      }
    }), { headers: corsHeaders });
  }

  // Agent Protocol & Smithery Manifests
  if (url.pathname === "/.well-known/agent.json" || url.pathname === "/agent.json") {
    return new Response(JSON.stringify({
      protocol: "agent-protocol/1.0",
      name: "OmniExtract & Shield",
      payment: { protocol: "x402", address: "0xD35f496aF8C73e4205b0Df9424D3aD6935981111", cost_usd: 0.002 }
    }), { headers: corsHeaders });
  }

  // MCP JSON-RPC
  if (url.pathname === "/mcp" && req.method === "POST") {
    const rpc = await req.json();
    if (rpc.method === "initialize") {
      return new Response(JSON.stringify({
        jsonrpc: "2.0",
        id: rpc.id,
        result: { capabilities: { tools: {} }, serverInfo: { name: "omniextract-shield", version: "1.0.0" } }
      }), { headers: corsHeaders });
    }
    if (rpc.method === "tools/list") {
      return new Response(JSON.stringify({
        jsonrpc: "2.0",
        id: rpc.id,
        result: {
          tools: [
            { name: "extract_web_markdown", description: "Extract Markdown from URL", inputSchema: { type: "object", properties: { url: { type: "string" } }, required: ["url"] } },
            { name: "sanitize_pii", description: "Redact PII", inputSchema: { type: "object", properties: { text: { type: "string" } }, required: ["text"] } }
          ]
        }
      }), { headers: corsHeaders });
    }
    if (rpc.method === "tools/call") {
      const { name, arguments: args } = rpc.params || {};
      if (name === "sanitize_pii") {
        const { sanitized, findings } = sanitizeText(args.text);
        return new Response(JSON.stringify({ jsonrpc: "2.0", id: rpc.id, result: { content: [{ type: "text", text: sanitized }], findings } }), { headers: corsHeaders });
      }
    }
  }

  // Auth Gate
  const rapidApiKey = req.headers.get("X-RapidAPI-Key") || req.headers.get("X-RapidAPI-Proxy-Secret");
  const authHeader = req.headers.get("Authorization");
  const isPublic = url.pathname === "/health" || url.pathname === "/" || url.pathname === "/docs" || url.pathname === "/openapi.json" || url.pathname.startsWith("/.well-known/") || url.pathname === "/mcp";

  if (!isPublic && !rapidApiKey) {
    if (!authHeader || !authHeader.startsWith("x402 ")) {
      const challengeId = `x402_chal_${Date.now()}`;
      return new Response(JSON.stringify({
        error: "Payment Required",
        status: 402,
        protocol: "x402/1.0",
        cost: { amount_usd: 0.002, currency: "USD" },
        challenge: { id: challengeId, payment_address: "0xD35f496aF8C73e4205b0Df9424D3aD6935981111" }
      }), { status: 402, headers: corsHeaders });
    }
  }

  // POST /v1/extract
  if (url.pathname === "/v1/extract" && req.method === "POST") {
    try {
      const body: ExtractRequest = await req.json();
      const resp = await fetch(body.url, { headers: { "User-Agent": "Mozilla/5.0" } });
      const html = await resp.text();
      const { markdown, title, description } = htmlToMarkdown(html, body.strip_images);
      return new Response(JSON.stringify({ success: true, url: body.url, title, description, content: markdown }), { headers: corsHeaders });
    } catch (e: any) {
      return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: corsHeaders });
    }
  }

  // POST /v1/sanitize
  if (url.pathname === "/v1/sanitize" && req.method === "POST") {
    try {
      const body: SanitizeRequest = await req.json();
      const { sanitized, findings } = sanitizeText(body.text);
      return new Response(JSON.stringify({ success: true, findings, sanitized_text: sanitized }), { headers: corsHeaders });
    } catch (e: any) {
      return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: corsHeaders });
    }
  }

  return new Response(JSON.stringify({ error: "Not Found" }), { status: 404, headers: corsHeaders });
}
