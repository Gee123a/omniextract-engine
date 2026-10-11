/**
 * Automated Test & Benchmark Suite for Micro-API Engine
 */

async function runTests() {
  const BASE_URL = "http://localhost:4040";
  console.log("=== Starting Automated Micro-API Test Suite ===");

  // Test 1: Health Check
  console.log("\n[Test 1] Health Check & Uptime...");
  const healthResp = await fetch(`${BASE_URL}/health`);
  const health = await healthResp.json();
  if (health.status !== "healthy") throw new Error("Health check failed");
  console.log("✓ Health Check Passed: Status OK, Memory RSS:", health.memory_usage_mb, "MB");

  // Test 2: OpenAPI Spec Validation
  console.log("\n[Test 2] OpenAPI Schema Export...");
  const specResp = await fetch(`${BASE_URL}/openapi.json`);
  const spec = await specResp.json();
  if (!spec.paths["/v1/extract"] || !spec.paths["/v1/sanitize"]) throw new Error("Invalid OpenAPI schema");
  console.log("✓ OpenAPI Spec Passed: Title:", spec.info.title, "Version:", spec.info.version);

  // Test 3: PII Redaction Engine
  console.log("\n[Test 3] PII Sanitization Engine...");
  const rawText = "Secret user info: john.doe@acme-corp.com, phone +1-555-123-4567, SSN 123-45-6789, API Key sk-proj-1234567890abcdef12345678, card 4111 2222 3333 4444.";
  const sanitizeResp = await fetch(`${BASE_URL}/v1/sanitize`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: rawText })
  });
  const sanitizeData = await sanitizeResp.json();
  console.log("Original text length:", rawText.length);
  console.log("Total redactions:", sanitizeData.total_redactions);
  console.log("Findings breakdown:", sanitizeData.findings);
  console.log("Sanitized output snippet:", sanitizeData.sanitized_text.slice(0, 80) + "...");
  if (sanitizeData.total_redactions < 5) throw new Error("PII detector missed patterns");
  console.log(`✓ Sanitization Passed: Latency ${sanitizeData.latency_ms} ms`);

  // Test 4: Live URL to Clean Markdown Extractor
  console.log("\n[Test 4] Live URL Extraction...");
  const extractResp = await fetch(`${BASE_URL}/v1/extract`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url: "https://example.com" })
  });
  const extractData = await extractResp.json();
  if (!extractData.success || !extractData.content.includes("Example Domain")) {
    throw new Error("Web extraction failed on test domain");
  }
  console.log("Extracted title:", extractData.title);
  console.log("Content words:", extractData.stats.words, "tokens:", extractData.stats.estimated_tokens);
  console.log("Extracted markdown snippet:\n" + extractData.content.trim());
  console.log(`✓ Extraction Passed: Latency ${extractData.stats.latency_ms} ms`);

  // Test 5: Latency & Throughput Benchmark
  console.log("\n[Test 5] High-Speed Throughput Benchmark (100 sequential requests)...");
  const benchStart = performance.now();
  for (let i = 0; i < 100; i++) {
    await fetch(`${BASE_URL}/v1/sanitize`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: "Hello user user@test.com with credit card 1234-5678-9012-3456" })
    });
  }
  const totalElapsed = performance.now() - benchStart;
  const avgLatency = (totalElapsed / 100).toFixed(2);
  const reqPerSec = Math.round(100 / (totalElapsed / 1000));
  console.log(`✓ Benchmark Results:`);
  console.log(`  Total time for 100 requests: ${totalElapsed.toFixed(1)} ms`);
  console.log(`  Average latency per request: ${avgLatency} ms`);
  console.log(`  Throughput: ~${reqPerSec} req/sec`);

  console.log("\n=== ALL 5 AUTOMATED TESTS PASSED ===");
}

runTests().catch(err => {
  console.error("Test failure:", err);
  process.exit(1);
});
